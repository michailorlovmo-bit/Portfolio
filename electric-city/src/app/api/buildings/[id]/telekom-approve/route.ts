import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recomputePhaseLocks } from "@/lib/phaseGating";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Only managers can set Telekom clearance" }, { status: 403 });
  }

  const { id } = await params;

  const building = await prisma.building.findUnique({ where: { id } });
  if (!building) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.building.update({
    where: { id },
    data: { telekomApprovedAt: new Date(), telekomApprovedById: session.user.id },
  });

  await recomputePhaseLocks(id);

  return NextResponse.json({ building: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const updated = await prisma.building.update({
    where: { id },
    data: { telekomApprovedAt: null, telekomApprovedById: null },
  });

  await recomputePhaseLocks(id);

  return NextResponse.json({ building: updated });
}
