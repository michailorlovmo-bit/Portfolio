import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_ROOT = "uploads";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function assertFileSizeOk(size: number) {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`File exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`);
  }
}

// Deliberately narrow: only types the review pipeline and the UI actually
// know how to handle. Notably excludes SVG/HTML — an inline-rendered
// user-uploaded SVG can carry a <script>, which would run in an
// authenticated session if opened directly.
export const PREVIEWABLE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);
const ALLOWED_MIME_TYPES = new Set([
  ...PREVIEWABLE_MIME_TYPES,
  "text/plain",
  "text/csv",
  "application/json",
]);

const EXTENSION_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".json": "application/json",
};

// Browsers don't always populate `file.type` for CSV/JSON reliably; fall
// back to the extension when the declared type is missing or unrecognized,
// but the result still has to pass assertUploadAllowed below.
export function resolveMimeType(filename: string, declaredType: string): string {
  if (ALLOWED_MIME_TYPES.has(declaredType)) return declaredType;
  const ext = path.extname(filename).toLowerCase();
  return EXTENSION_MIME[ext] || declaredType || "application/octet-stream";
}

const MAGIC_BYTE_CHECKS: Record<string, (buf: Buffer) => boolean> = {
  "image/png": (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/jpeg": (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/webp": (b) => b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  "image/heic": (b) => b.length >= 12 && b.toString("ascii", 4, 8) === "ftyp",
  "image/heif": (b) => b.length >= 12 && b.toString("ascii", 4, 8) === "ftyp",
  "application/pdf": (b) => b.length >= 5 && b.toString("ascii", 0, 5) === "%PDF-",
};

// The declared/resolved MIME type is still just a label the client chose —
// for binary types we confirm the file's actual bytes match before trusting
// it enough to ever serve it back with `Content-Disposition: inline`.
export function assertUploadAllowed(mimeType: string, buffer: Buffer) {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(
      `File type "${mimeType}" isn't supported. Upload a photo (JPEG/PNG/WEBP/HEIC), a PDF, or a text/CSV file.`
    );
  }
  const magicCheck = MAGIC_BYTE_CHECKS[mimeType];
  if (magicCheck && !magicCheck(buffer)) {
    throw new Error("File content doesn't match its declared type.");
  }
}

export async function savePhaseFile(
  phaseTaskId: string,
  originalName: string,
  buffer: Buffer
): Promise<{ storedPath: string; size: number }> {
  const dir = path.join(process.cwd(), UPLOAD_ROOT, phaseTaskId);
  await fs.mkdir(dir, { recursive: true });

  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${randomUUID()}-${safeName}`;
  const absolutePath = path.join(dir, filename);
  await fs.writeFile(absolutePath, buffer);

  const storedPath = path.join(UPLOAD_ROOT, phaseTaskId, filename);
  return { storedPath, size: buffer.length };
}
