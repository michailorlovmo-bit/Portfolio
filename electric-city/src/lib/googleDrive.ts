import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import { categoryDef } from "@/lib/categories";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

// Both must be set for Drive backup to activate; until then every call here
// is a silent no-op so the app works exactly the same with or without it —
// this is meant to be turned on later by adding the two env vars, not a
// required part of setup.
export function isDriveConfigured(): boolean {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !!process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
}

let cachedClient: drive_v3.Drive | null | undefined;

function getDriveClient(): drive_v3.Drive | null {
  if (cachedClient !== undefined) return cachedClient;

  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyJson) {
    cachedClient = null;
    return null;
  }

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(keyJson);
  } catch {
    console.error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON — Google Drive backup is disabled until it's fixed."
    );
    cachedClient = null;
    return null;
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  cachedClient = google.drive({ version: "v3", auth });
  return cachedClient;
}

// Drive folder/file names allow almost anything, but this keeps names tidy
// and avoids a stray "/" being read as a path separator by anyone syncing
// the folder locally via Google Drive for Desktop.
function sanitizeName(name: string): string {
  const cleaned = name.trim().replace(/[\\/]/g, "-").slice(0, 200);
  return cleaned || "Untitled";
}

function escapeForDriveQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function buildingFolderName(buildingName: string, buildingId: string): string {
  // The short id suffix disambiguates buildings that share a name (e.g. a
  // duplicated building named "<original> (copy)" before it's renamed).
  return `${sanitizeName(buildingName)} (${buildingId.slice(-6)})`;
}

export function driveFileName(category: string, originalFilename: string): string {
  return `${categoryDef(category).labelEn} - ${sanitizeName(originalFilename)}`;
}

async function findOrCreateFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string
): Promise<string> {
  const query = [
    `'${parentId}' in parents`,
    `mimeType='${FOLDER_MIME_TYPE}'`,
    `name='${escapeForDriveQuery(name)}'`,
    "trashed=false",
  ].join(" and ");

  const existing = await drive.files.list({
    q: query,
    fields: "files(id)",
    spaces: "drive",
    pageSize: 1,
  });
  const existingId = existing.data.files?.[0]?.id;
  if (existingId) return existingId;

  const created = await drive.files.create({
    requestBody: { name, mimeType: FOLDER_MIME_TYPE, parents: [parentId] },
    fields: "id",
  });
  if (!created.data.id) throw new Error("Drive did not return an id for the created folder");
  return created.data.id;
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string | null;
}

// Best-effort mirror of an uploaded phase file into Google Drive, organized
// as <root folder>/<building name (short id)>/<category> - <filename>.
// Returns null (never throws) if Drive isn't configured or the API call
// fails — callers should treat this purely as a bonus, not something the
// upload flow depends on.
export async function uploadFileToDrive(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  category: string;
  buildingName: string;
  buildingId: string;
}): Promise<DriveUploadResult | null> {
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const drive = getDriveClient();
  if (!drive || !rootFolderId) return null;

  try {
    const folderId = await findOrCreateFolder(
      drive,
      rootFolderId,
      buildingFolderName(params.buildingName, params.buildingId)
    );

    const res = await drive.files.create({
      requestBody: {
        name: driveFileName(params.category, params.filename),
        parents: [folderId],
      },
      media: {
        mimeType: params.mimeType,
        body: Readable.from(params.buffer),
      },
      fields: "id, webViewLink",
    });

    if (!res.data.id) return null;
    return { fileId: res.data.id, webViewLink: res.data.webViewLink || null };
  } catch (e) {
    console.error("Google Drive upload failed (file is still saved locally):", e);
    return null;
  }
}
