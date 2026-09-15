import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  active: z.boolean().optional(),
  canViewStats: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "You can't change your own access here" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, boolean> = {};

  if (parsed.data.active !== undefined) {
    data.active = parsed.data.active;
  }

  if (parsed.data.canViewStats !== undefined) {
    // Statistics access is a trusted, self-perpetuating circle: only someone
    // who already has it can grant or revoke it for someone else.
    if (!session.user.canViewStats) {
      return NextResponse.json(
        { error: "Only an existing statistics-access holder can change this" },
        { status: 403 }
      );
    }
    data.canViewStats = parsed.data.canViewStats;
  }

  // Deactivating someone doesn't touch their history, but it must not leave
  // open work silently stuck on an account nobody can sign into anymore —
  // free those phases up so they resurface on the dashboard's "Needs
  // assignment" list instead of quietly stalling.
  const isDeactivating = parsed.data.active === false;

  const { user, unassignedTaskCount } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        category: true,
        active: true,
        canViewStats: true,
        createdAt: true,
      },
    });

    let unassignedTaskCount = 0;
    if (isDeactivating) {
      const result = await tx.phaseTask.updateMany({
        where: { assignedToId: id, status: { notIn: ["DONE", "LOCKED"] } },
        data: { assignedToId: null },
      });
      unassignedTaskCount = result.count;
    }

    return { user, unassignedTaskCount };
  });

  return NextResponse.json({ user, unassignedTaskCount });
}
