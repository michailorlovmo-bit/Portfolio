import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewSubmission } from "@/lib/gemini";
import { recomputePhaseLocks } from "@/lib/phaseGating";
import { notifyUser, notifyManagers } from "@/lib/notifications";
import { categoryLabel } from "@/lib/categories";

const submitSchema = z.object({
  notes: z.string().max(5000).optional(),
  readings: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        value: z.string().min(1).max(200),
        unit: z.string().max(50).optional(),
      })
    )
    .default([]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const task = await prisma.phaseTask.findUnique({
    where: { id },
    include: {
      files: true,
      checklistItems: { orderBy: { order: "asc" } },
      building: {
        include: { bepEntries: true, bmoEntries: true, cableEntries: true, floorBoxes: true },
      },
    },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (task.status === "LOCKED") {
    return NextResponse.json({ error: "This phase is locked" }, { status: 403 });
  }
  if (task.assignedToId !== session.user.id) {
    return NextResponse.json({ error: "Only the assignee can submit this phase" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // If the AI review below fails, status gets reverted here rather than
  // left stuck on SUBMITTED.
  const statusBeforeSubmission = task.status;

  // A plain read-then-write can't stop a genuine race (a second open tab,
  // a network retry arriving at nearly the same time as the first request)
  // from both reading the pre-submission status before either has written
  // SUBMITTED. This update is conditioned on status still being what we
  // read, evaluated atomically by the database in one statement — so at
  // most one concurrent request can ever win it.
  const claim = await prisma.phaseTask.updateMany({
    where: { id, status: { notIn: ["LOCKED", "SUBMITTED"] } },
    data: {
      status: "SUBMITTED",
      submissionNotes: parsed.data.notes || null,
      submittedAt: new Date(),
    },
  });
  if (claim.count === 0) {
    return NextResponse.json(
      { error: "This submission is already being reviewed" },
      { status: 409 }
    );
  }

  // Readings represent the current submission's measurements, not a history —
  // replace rather than accumulate across resubmissions.
  await prisma.phaseTestReading.deleteMany({ where: { phaseTaskId: id } });
  if (parsed.data.readings.length > 0) {
    await prisma.phaseTestReading.createMany({
      data: parsed.data.readings.map((r) => ({
        phaseTaskId: id,
        label: r.label,
        value: r.value,
        unit: r.unit || null,
      })),
    });
  }

  let review;
  try {
    const result = await reviewSubmission(
      {
        name: task.building.name,
        address: task.building.address,
        totalFloors: task.building.totalFloors,
        bepEntries: task.building.bepEntries.map((e) => e.label),
        bmoEntries: task.building.bmoEntries.map((e) => e.label),
        cableEntries: task.building.cableEntries.map((e) => e.label),
        floorBoxes: task.building.floorBoxes.map((fb) => ({
          floorNumber: fb.floorNumber,
          quantity: fb.quantity,
          type: fb.type,
          notes: fb.notes,
        })),
      },
      {
        category: task.category,
        submissionNotes: parsed.data.notes || null,
        checklist: task.checklistItems.map((c) => c.label),
        testReadings: parsed.data.readings.map((r) => ({
          label: r.label,
          value: r.value,
          unit: r.unit || null,
        })),
      },
      task.files.map((f) => ({
        filename: f.filename,
        storedPath: f.storedPath,
        mimeType: f.mimeType,
      }))
    );

    review = await prisma.phaseReview.create({
      data: {
        phaseTaskId: id,
        verdict: result.verdict,
        summary: result.summary,
        feedback: result.feedback,
        filesNote: result.filesNote,
        checklistResults: JSON.stringify(result.checklistResults),
        model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
      },
    });

    await prisma.phaseTask.update({
      where: { id },
      data: {
        status: result.verdict === "APPROVED" ? "DONE" : "NEEDS_REVISION",
      },
    });

    if (result.verdict === "APPROVED") {
      await recomputePhaseLocks(task.buildingId);
    } else if (task.assignedToId) {
      await notifyUser(
        task.assignedToId,
        `${categoryLabel(task.category)} on "${task.building.name}" ${result.verdict === "FLAGGED" ? "was flagged" : "needs revision"}: ${result.summary}`,
        `/phase-tasks/${task.id}`
      );
      if (result.verdict === "FLAGGED") {
        await notifyManagers(
          `${categoryLabel(task.category)} on "${task.building.name}" was flagged by the AI review: ${result.summary}`,
          `/phase-tasks/${task.id}`
        );
      }
    }
  } catch (e) {
    await prisma.phaseTask.update({
      where: { id },
      data: { status: statusBeforeSubmission },
    });
    return NextResponse.json(
      {
        error: `Submission saved, but the AI review failed: ${(e as Error).message}`,
      },
      { status: 502 }
    );
  }

  const updatedTask = await prisma.phaseTask.findUnique({
    where: { id },
    include: { reviews: { orderBy: { createdAt: "desc" } } },
  });

  return NextResponse.json({ task: updatedTask, review });
}
