import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/categories";

const updateSchema = z.object({
  active: z.boolean().optional(),
  canViewStats: z.boolean().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  category: z.enum(CATEGORIES.map((c) => c.key) as [string, ...string[]]).nullable().optional(),
  subcontractorName: z.string().trim().min(1).max(200).nullable().optional(),
  newPassword: z.string().min(8).max(200).optional(),
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

  const data: Record<string, unknown> = {};

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

  if (parsed.data.name !== undefined) {
    data.name = parsed.data.name;
  }

  if (parsed.data.category !== undefined) {
    data.category = parsed.data.category;
  }

  if (parsed.data.subcontractorName !== undefined) {
    data.subcontractorName = parsed.data.subcontractorName;
  }

  if (parsed.data.newPassword !== undefined) {
    // A manager-set reset, not a self-service "forgot password" flow — this
    // app has no email/SMTP setup, so this is the only recovery path if
    // someone forgets their password. The technician should change it again
    // themselves from the account page once they're back in.
    data.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
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
        subcontractorName: true,
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
