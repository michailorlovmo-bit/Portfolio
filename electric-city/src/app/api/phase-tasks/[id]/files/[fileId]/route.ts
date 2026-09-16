import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import fs from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PREVIEWABLE_MIME_TYPES } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, fileId } = await params;

  const file = await prisma.phaseFile.findUnique({
    where: { id: fileId },
    include: { phaseTask: true },
  });
  if (!file || file.phaseTaskId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isManager = session.user.role === "MANAGER";
  if (!isManager && file.phaseTask.assignedToId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const absolutePath = path.join(process.cwd(), file.storedPath);
  let data: Buffer;
  try {
    data = await fs.readFile(absolutePath);
  } catch {
    return NextResponse.json({ error: "File missing from storage" }, { status: 404 });
  }

  const isPreviewable = PREVIEWABLE_MIME_TYPES.has(file.mimeType);
  const disposition = isPreviewable ? "inline" : "attachment";

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(file.filename)}"`,
      "X-Content-Type-Options": "nosniff",
      // Belt-and-braces: even if a mistyped/legacy file somehow got past the
      // upload-time allowlist, this stops any script it contains from
      // running when the URL is opened directly.
      "Content-Security-Policy": "sandbox",
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, fileId } = await params;

  const file = await prisma.phaseFile.findUnique({
    where: { id: fileId },
    include: { phaseTask: true },
  });
  if (!file || file.phaseTaskId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isManager = session.user.role === "MANAGER";
  if (!isManager && file.phaseTask.assignedToId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // A Done phase is an approved historical record — removing evidence from
  // it after the fact isn't a "fix a mistake" action anymore. Locked means
  // there's no submission to fix in the first place.
  if (file.phaseTask.status === "DONE" || file.phaseTask.status === "LOCKED") {
    return NextResponse.json(
      { error: "Files can't be removed from a Done or Locked phase" },
      { status: 403 }
    );
  }

  await prisma.phaseFile.delete({ where: { id: fileId } });

  const absolutePath = path.join(process.cwd(), file.storedPath);
  await fs.unlink(absolutePath).catch(() => null);

  return NextResponse.json({ ok: true });
}
