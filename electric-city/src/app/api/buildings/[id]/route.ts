import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const building = await prisma.building.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      telekomApprovedBy: { select: { id: true, name: true } },
      bepEntries: true,
      bmoEntries: true,
      cableEntries: true,
      floorBoxes: { orderBy: { floorNumber: "asc" } },
      phaseTasks: {
        orderBy: { orderIndex: "asc" },
        include: {
          assignedTo: { select: { id: true, name: true } },
          reviews: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!building) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "MANAGER") {
    const isAssigned = building.phaseTasks.some((t) => t.assignedToId === session.user.id);
    if (!isAssigned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ building });
}

const floorBoxSchema = z.object({
  floorNumber: z.number().int(),
  quantity: z.number().int().min(0),
  type: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

const updateBuildingSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  totalFloors: z.number().int().min(1),
  bepEntries: z.array(z.string().min(1).max(300)).default([]),
  bmoEntries: z.array(z.string().min(1).max(300)).default([]),
  cableEntries: z.array(z.string().min(1).max(300)).default([]),
  floorBoxes: z.array(floorBoxSchema).default([]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Only managers can edit buildings" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.building.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateBuildingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, address, totalFloors, bepEntries, bmoEntries, cableEntries, floorBoxes } =
    parsed.data;

  // Spec entries are small, manager-edited lists — simplest and safest to
  // replace them wholesale rather than diff individual rows.
  const building = await prisma.$transaction(async (tx) => {
    await tx.bepEntry.deleteMany({ where: { buildingId: id } });
    await tx.bmoEntry.deleteMany({ where: { buildingId: id } });
    await tx.cableEntry.deleteMany({ where: { buildingId: id } });
    await tx.floorBox.deleteMany({ where: { buildingId: id } });

    return tx.building.update({
      where: { id },
      data: {
        name,
        address,
        totalFloors,
        bepEntries: { create: bepEntries.map((label) => ({ label })) },
        bmoEntries: { create: bmoEntries.map((label) => ({ label })) },
        cableEntries: { create: cableEntries.map((label) => ({ label })) },
        floorBoxes: { create: floorBoxes },
      },
      include: {
        bepEntries: true,
        bmoEntries: true,
        cableEntries: true,
        floorBoxes: { orderBy: { floorNumber: "asc" } },
      },
    });
  });

  return NextResponse.json({ building });
}
