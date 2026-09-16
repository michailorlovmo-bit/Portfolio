import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// A full, human-readable dump of the business data (not the SQLite file
// itself, and never file bytes or password hashes) — a manager-level
// backup/export that doesn't require server or Docker-volume access.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Only managers can download a backup" }, { status: 403 });
  }

  const [buildings, users, checklistTemplates] = await Promise.all([
    prisma.building.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        createdBy: { select: { name: true, email: true } },
        telekomApprovedBy: { select: { name: true, email: true } },
        bepEntries: { select: { label: true } },
        bmoEntries: { select: { label: true } },
        cableEntries: { select: { label: true } },
        floorBoxes: {
          orderBy: { floorNumber: "asc" },
          select: { floorNumber: true, quantity: true, type: true, notes: true },
        },
        phaseTasks: {
          orderBy: { orderIndex: "asc" },
          include: {
            assignedTo: { select: { name: true, email: true, subcontractorName: true } },
            checklistItems: { orderBy: { order: "asc" }, select: { label: true } },
            testReadings: { select: { label: true, value: true, unit: true } },
            files: {
              orderBy: { createdAt: "asc" },
              select: {
                filename: true,
                mimeType: true,
                size: true,
                createdAt: true,
                uploadedBy: { select: { name: true, email: true } },
              },
            },
            reviews: {
              orderBy: { createdAt: "asc" },
              select: {
                verdict: true,
                summary: true,
                feedback: true,
                filesNote: true,
                checklistResults: true,
                model: true,
                createdAt: true,
              },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        name: true,
        email: true,
        role: true,
        category: true,
        subcontractorName: true,
        active: true,
        canViewStats: true,
        createdAt: true,
      },
    }),
    prisma.checklistTemplateItem.findMany({
      orderBy: [{ category: "asc" }, { order: "asc" }],
      select: { category: true, label: true, order: true },
    }),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    exportedBy: session.user.email,
    buildings: buildings.map((b) => ({
      name: b.name,
      address: b.address,
      totalFloors: b.totalFloors,
      createdAt: b.createdAt,
      createdBy: b.createdBy,
      archived: b.archived,
      archivedAt: b.archivedAt,
      telekomApprovedAt: b.telekomApprovedAt,
      telekomApprovedBy: b.telekomApprovedBy,
      bepEntries: b.bepEntries.map((e) => e.label),
      bmoEntries: b.bmoEntries.map((e) => e.label),
      cableEntries: b.cableEntries.map((e) => e.label),
      floorBoxes: b.floorBoxes,
      phaseTasks: b.phaseTasks.map((t) => ({
        category: t.category,
        status: t.status,
        assignedTo: t.assignedTo,
        dueDate: t.dueDate,
        submissionNotes: t.submissionNotes,
        submittedAt: t.submittedAt,
        checklist: t.checklistItems.map((c) => c.label),
        testReadings: t.testReadings,
        // File bytes live on local disk, not in the database — this backup
        // is a record of what was uploaded, not a copy of the files
        // themselves.
        files: t.files,
        reviews: t.reviews.map((r) => ({
          ...r,
          checklistResults: JSON.parse(r.checklistResults),
        })),
      })),
    })),
    staff: users,
    checklistTemplates,
  };

  const json = JSON.stringify(backup, null, 2);
  const filename = `electric-city-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
