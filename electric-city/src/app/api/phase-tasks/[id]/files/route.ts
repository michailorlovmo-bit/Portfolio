import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savePhaseFile, assertFileSizeOk, resolveMimeType, assertUploadAllowed } from "@/lib/storage";
import { isDriveConfigured, uploadFileToDrive } from "@/lib/googleDrive";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const task = await prisma.phaseTask.findUnique({
    where: { id },
    include: { building: { select: { id: true, name: true } } },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isManager = session.user.role === "MANAGER";
  if (!isManager && task.assignedToId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (task.status === "LOCKED") {
    return NextResponse.json({ error: "This phase is locked" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    assertFileSizeOk(file.size);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = resolveMimeType(file.name, file.type);
  try {
    assertUploadAllowed(mimeType, buffer);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const { storedPath, size } = await savePhaseFile(id, file.name, buffer);

  let phaseFile = await prisma.phaseFile.create({
    data: {
      phaseTaskId: id,
      uploadedById: session.user.id,
      filename: file.name,
      storedPath,
      mimeType,
      size,
    },
  });

  // Best-effort mirror to Google Drive — the local copy on disk is always
  // the source of truth, so a Drive failure (or it not being configured
  // yet) never blocks or fails the upload itself.
  if (isDriveConfigured()) {
    const driveResult = await uploadFileToDrive({
      buffer,
      filename: file.name,
      mimeType,
      category: task.category,
      buildingName: task.building.name,
      buildingId: task.building.id,
    });
    if (driveResult) {
      phaseFile = await prisma.phaseFile.update({
        where: { id: phaseFile.id },
        data: { driveFileId: driveResult.fileId, driveViewLink: driveResult.webViewLink },
      });
    }
  }

  return NextResponse.json({ file: phaseFile }, { status: 201 });
}
