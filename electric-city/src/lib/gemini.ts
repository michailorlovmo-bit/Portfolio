import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import fs from "fs/promises";
import path from "path";
import { categoryLabel } from "@/lib/categories";

export type ReviewVerdict = "APPROVED" | "NEEDS_REVISION" | "FLAGGED";

export interface ChecklistResult {
  label: string;
  satisfied: boolean;
  note: string;
}

export interface ReviewResult {
  verdict: ReviewVerdict;
  summary: string;
  feedback: string;
  filesNote: string;
  checklistResults: ChecklistResult[];
}

interface BuildingSpec {
  name: string;
  address: string | null;
  totalFloors: number;
  bepEntries: string[];
  bmoEntries: string[];
  cableEntries: string[];
  floorBoxes: { floorNumber: number; quantity: number; type: string | null; notes: string | null }[];
}

interface PhaseForReview {
  category: string;
  submissionNotes: string | null;
  checklist: string[];
  testReadings: { label: string; value: string; unit: string | null }[];
}

interface FileForReview {
  filename: string;
  storedPath: string;
  mimeType: string;
}

const TEXTUAL_MIME_PREFIXES = ["text/", "application/json", "application/csv"];
const INLINE_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MAX_TEXT_CHARS = 40_000;

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    verdict: {
      type: SchemaType.STRING,
      enum: ["APPROVED", "NEEDS_REVISION", "FLAGGED"],
      description:
        "APPROVED: every checklist item is satisfied by the notes/files. NEEDS_REVISION: close but one or more checklist items are missing or unclear. FLAGGED: seriously incomplete, incorrect, or the submission looks unrelated to this building/phase.",
    },
    summary: {
      type: SchemaType.STRING,
      description: "One sentence verdict summary, written for the field technician.",
    },
    feedback: {
      type: SchemaType.STRING,
      description:
        "Specific, actionable feedback: what was done well, what is missing or wrong, and what to fix. Reference the checklist items and building spec directly.",
    },
    filesNote: {
      type: SchemaType.STRING,
      description:
        "One or two sentences on what was found in the uploaded files specifically, or 'No files were uploaded.' if none.",
    },
    checklistResults: {
      type: SchemaType.ARRAY,
      description:
        "One entry per checklist item given in the prompt, using the exact same label text, in the same order.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING },
          satisfied: { type: SchemaType.BOOLEAN },
          note: {
            type: SchemaType.STRING,
            description: "Short reason why this item is or isn't satisfied.",
          },
        },
        required: ["label", "satisfied", "note"],
      },
    },
  },
  required: ["verdict", "summary", "feedback", "filesNote", "checklistResults"],
};

const RETRYABLE_STATUS_PATTERN = /\[(429|500|502|503|504)\b/;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini's shared capacity returns transient 503s fairly often. Retry a few
// times with backoff before surfacing an error to the technician — most
// overload spikes clear within a few seconds.
async function generateWithRetry(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  parts: Parameters<ReturnType<GoogleGenerativeAI["getGenerativeModel"]>["generateContent"]>[0],
  maxAttempts = 4
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await model.generateContent(parts);
    } catch (e) {
      lastError = e;
      const message = e instanceof Error ? e.message : String(e);
      const isRetryable = RETRYABLE_STATUS_PATTERN.test(message);
      if (!isRetryable || attempt === maxAttempts) throw e;
      const backoffMs = 1000 * 2 ** (attempt - 1) + Math.random() * 500;
      await sleep(backoffMs);
    }
  }
  throw lastError;
}

export async function reviewSubmission(
  building: BuildingSpec,
  phase: PhaseForReview,
  files: FileForReview[]
): Promise<ReviewResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const floorBoxLines = building.floorBoxes.length
    ? building.floorBoxes
        .map(
          (fb) =>
            `  Floor ${fb.floorNumber}: ${fb.quantity} box(es)${fb.type ? `, type: ${fb.type}` : ""}${fb.notes ? `, notes: ${fb.notes}` : ""}`
        )
        .join("\n")
    : "  (none specified)";

  const promptHeader = [
    "You are reviewing fiber-optic installation work for a telecom contractor.",
    "A field technician has submitted a phase of work on a building as complete.",
    "Judge the submission strictly against the checklist for this phase, using the building's",
    "spec for context. Be fair but rigorous: mark an item unsatisfied if the notes/files don't",
    "clearly show it was done, and call out anything wrong, missing, or inconsistent.",
    "",
    `Building: ${building.name}${building.address ? ` (${building.address})` : ""}`,
    `Total floors: ${building.totalFloors}`,
    `BEP (Building Entry Point) entries: ${building.bepEntries.join("; ") || "(none specified)"}`,
    `BMO (Building Main Outlet) entries: ${building.bmoEntries.join("; ") || "(none specified)"}`,
    `Cable entries: ${building.cableEntries.join("; ") || "(none specified)"}`,
    `Floor boxes required:\n${floorBoxLines}`,
    "",
    `Phase being reviewed: ${categoryLabel(phase.category)}`,
    "Checklist for this phase (evaluate each item independently):",
    phase.checklist.length
      ? phase.checklist.map((c, i) => `  ${i + 1}. ${c}`).join("\n")
      : "  (no checklist items configured for this category — just assess the submission generally and note this in feedback)",
    "",
    `Technician's submission notes: ${phase.submissionNotes || "(no notes provided)"}`,
    "",
    phase.testReadings.length
      ? `Test readings submitted:\n${phase.testReadings.map((r) => `  ${r.label}: ${r.value}${r.unit ? ` ${r.unit}` : ""}`).join("\n")}`
      : "No test readings were submitted.",
    "",
    files.length
      ? `The technician uploaded ${files.length} file(s), included below.`
      : "The technician did not upload any files.",
  ].join("\n");

  const parts: Array<
    { text: string } | { inlineData: { data: string; mimeType: string } }
  > = [{ text: promptHeader }];

  for (const file of files) {
    const absolutePath = path.join(process.cwd(), file.storedPath);
    try {
      if (INLINE_MIME_TYPES.has(file.mimeType)) {
        const buffer = await fs.readFile(absolutePath);
        parts.push({
          inlineData: { data: buffer.toString("base64"), mimeType: file.mimeType },
        });
        parts.push({ text: `(above: file "${file.filename}")` });
      } else if (TEXTUAL_MIME_PREFIXES.some((p) => file.mimeType.startsWith(p))) {
        const text = await fs.readFile(absolutePath, "utf-8");
        const truncated =
          text.length > MAX_TEXT_CHARS
            ? text.slice(0, MAX_TEXT_CHARS) + "\n...[truncated]"
            : text;
        parts.push({
          text: `--- Contents of file "${file.filename}" (${file.mimeType}) ---\n${truncated}`,
        });
      } else {
        parts.push({
          text: `File "${file.filename}" has type ${file.mimeType}, which cannot be inspected directly. Note this limitation in filesNote.`,
        });
      }
    } catch {
      parts.push({
        text: `File "${file.filename}" could not be read from storage. Note this in filesNote.`,
      });
    }
  }

  const result = await generateWithRetry(model, parts);
  const text = result.response.text();

  let parsed: ReviewResult;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned a response that could not be parsed as JSON.");
  }

  return parsed;
}
