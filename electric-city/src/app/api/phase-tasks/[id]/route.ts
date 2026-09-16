import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recomputePhaseLocks } from "@/lib/phaseGating";

async function getPhaseTaskOr404(id: string) {
  return prisma.phaseTask.findUnique({
    where: { id },
    include: {
      building: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      checklistItems: { orderBy: { order: "asc" } },
      files: { orderBy: { createdAt: "desc" } },
      reviews: { orderBy: { createdAt: "desc" } },
      testReadings: true,
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const task = await getPhaseTaskOr404(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "MANAGER" && task.assignedToId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ task });
}

const updateSchema = z.object({
  assignedToId: z.string().nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "SUBMITTED", "DONE", "NEEDS_REVISION"]).optional(),
  dueDate: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const task = await prisma.phaseTask.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const isManager = session.user.role === "MANAGER";
  const isAssignee = task.assignedToId === session.user.id;

  if (!isManager && !isAssignee) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};

  if (parsed.data.assignedToId !== undefined) {
    if (!isManager) {
      return NextResponse.json({ error: "Only managers can reassign a phase" }, { status: 403 });
    }
    if (parsed.data.assignedToId !== null) {
      // The assign form only ever offers active staff, but the API is a
      // separate trust boundary — without this, a raw request could park a
      // phase on a deactivated, non-existent, or manager account, silently
      // making it unreachable from anyone's "your tasks" list.
      const assignee = await prisma.user.findUnique({ where: { id: parsed.data.assignedToId } });
      if (!assignee || !assignee.active || assignee.role !== "STAFF") {
        return NextResponse.json(
          { error: "Assignee must be an active staff account" },
          { status: 400 }
        );
      }
    }
    data.assignedToId = parsed.data.assignedToId;
  }

  if (parsed.data.dueDate !== undefined) {
    if (!isManager) {
      return NextResponse.json({ error: "Only managers can set a due date" }, { status: 403 });
    }
    data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  }

  if (parsed.data.status) {
    if (task.status === "LOCKED") {
      return NextResponse.json({ error: "This phase is locked" }, { status: 403 });
    }
    if (!isManager && !["IN_PROGRESS"].includes(parsed.data.status)) {
      return NextResponse.json(
        { error: "Staff can only move a phase to IN_PROGRESS. Use submit to send it for review." },
        { status: 403 }
      );
    }
    data.status = parsed.data.status;
  }

  const updated = await prisma.phaseTask.update({ where: { id }, data });

  if (parsed.data.status === "DONE") {
    await recomputePhaseLocks(task.buildingId);
  }

  return NextResponse.json({ task: updated });
}
