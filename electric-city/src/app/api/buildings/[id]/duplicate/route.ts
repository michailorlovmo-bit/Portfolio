import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPhaseTasksForBuilding } from "@/lib/phaseGating";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const source = await prisma.building.findUnique({
    where: { id },
    include: { bepEntries: true, bmoEntries: true, cableEntries: true, floorBoxes: true },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Spec only — deliberately not phase progress, files, or reviews, since a
  // duplicate is a fresh building that starts its own pipeline from scratch.
  const building = await prisma.building.create({
    data: {
      name: `${source.name} (copy)`,
      address: source.address,
      totalFloors: source.totalFloors,
      createdById: session.user.id,
      bepEntries: { create: source.bepEntries.map((e) => ({ label: e.label })) },
      bmoEntries: { create: source.bmoEntries.map((e) => ({ label: e.label })) },
      cableEntries: { create: source.cableEntries.map((e) => ({ label: e.label })) },
      floorBoxes: {
        create: source.floorBoxes.map((fb) => ({
          floorNumber: fb.floorNumber,
          quantity: fb.quantity,
          type: fb.type,
          notes: fb.notes,
        })),
      },
    },
  });

  await createPhaseTasksForBuilding(building.id);

  return NextResponse.json({ building }, { status: 201 });
}
