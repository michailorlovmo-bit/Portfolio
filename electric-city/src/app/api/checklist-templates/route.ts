import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/categories";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.checklistTemplateItem.findMany({
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });

  return NextResponse.json({ items });
}

const createItemSchema = z.object({
  category: z.enum(CATEGORIES.map((c) => c.key) as [string, ...string[]]),
  label: z.string().min(1).max(300),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const count = await prisma.checklistTemplateItem.count({
    where: { category: parsed.data.category },
  });

  const item = await prisma.checklistTemplateItem.create({
    data: { category: parsed.data.category, label: parsed.data.label, order: count },
  });

  return NextResponse.json({ item }, { status: 201 });
}
