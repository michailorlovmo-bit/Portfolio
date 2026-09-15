import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPhaseTasksForBuilding } from "@/lib/phaseGating";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const buildings = await prisma.building.findMany({
    where:
      session.user.role === "MANAGER"
        ? {}
        : { phaseTasks: { some: { assignedToId: session.user.id } } },
    include: {
      phaseTasks: {
        orderBy: { orderIndex: "asc" },
        include: { assignedTo: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ buildings });
}

const floorBoxSchema = z.object({
  floorNumber: z.number().int(),
  quantity: z.number().int().min(0),
  type: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

const createBuildingSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  totalFloors: z.number().int().min(1),
  bepEntries: z.array(z.string().min(1).max(300)).default([]),
  bmoEntries: z.array(z.string().min(1).max(300)).default([]),
  cableEntries: z.array(z.string().min(1).max(300)).default([]),
  floorBoxes: z.array(floorBoxSchema).default([]),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Only managers can create buildings" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createBuildingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, address, totalFloors, bepEntries, bmoEntries, cableEntries, floorBoxes } =
    parsed.data;

  const building = await prisma.building.create({
    data: {
      name,
      address,
      totalFloors,
      createdById: session.user.id,
      bepEntries: { create: bepEntries.map((label) => ({ label })) },
      bmoEntries: { create: bmoEntries.map((label) => ({ label })) },
      cableEntries: { create: cableEntries.map((label) => ({ label })) },
      floorBoxes: { create: floorBoxes },
    },
  });

  await createPhaseTasksForBuilding(building.id);

  return NextResponse.json({ building }, { status: 201 });
}
