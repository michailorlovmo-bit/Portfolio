import { describe, it, expect } from "vitest";
import { assertFileSizeOk, resolveMimeType, assertUploadAllowed } from "./storage";

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0]);
const PDF_BYTES = Buffer.from("%PDF-1.4\n...");
const TEXT_BYTES = Buffer.from("hello world");
const SVG_WITH_SCRIPT = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");

describe("assertFileSizeOk", () => {
  it("allows files under the 20MB limit", () => {
    expect(() => assertFileSizeOk(1024)).not.toThrow();
  });

  it("rejects files over the limit", () => {
    expect(() => assertFileSizeOk(21 * 1024 * 1024)).toThrow();
  });
});

describe("resolveMimeType", () => {
  it("trusts a declared type that's already in the allowlist", () => {
    expect(resolveMimeType("photo.png", "image/png")).toBe("image/png");
  });

  it("falls back to the file extension when the declared type is missing", () => {
    expect(resolveMimeType("notes.txt", "")).toBe("text/plain");
    expect(resolveMimeType("data.csv", "")).toBe("text/csv");
  });

  it("falls back to the extension when the declared type isn't recognized", () => {
    // Some browsers/OSes report an unhelpful generic type for known extensions.
    expect(resolveMimeType("report.pdf", "application/octet-stream")).toBe("application/pdf");
  });

  it("leaves an unrecognized type/extension combo alone for assertUploadAllowed to reject", () => {
    expect(resolveMimeType("script.html", "text/html")).toBe("text/html");
    expect(resolveMimeType("mystery", "")).toBe("application/octet-stream");
  });
});

describe("assertUploadAllowed", () => {
  it("accepts real image bytes declared with their true type", () => {
    expect(() => assertUploadAllowed("image/png", PNG_BYTES)).not.toThrow();
    expect(() => assertUploadAllowed("image/jpeg", JPEG_BYTES)).not.toThrow();
    expect(() => assertUploadAllowed("application/pdf", PDF_BYTES)).not.toThrow();
  });

  it("accepts plain text/csv/json without a magic-byte check", () => {
    expect(() => assertUploadAllowed("text/plain", TEXT_BYTES)).not.toThrow();
    expect(() => assertUploadAllowed("text/csv", TEXT_BYTES)).not.toThrow();
    expect(() => assertUploadAllowed("application/json", TEXT_BYTES)).not.toThrow();
  });

  it("rejects a type that was never in the allowlist, e.g. SVG or HTML", () => {
    expect(() => assertUploadAllowed("image/svg+xml", SVG_WITH_SCRIPT)).toThrow();
    expect(() => assertUploadAllowed("text/html", SVG_WITH_SCRIPT)).toThrow();
  });

  it("rejects content whose real bytes don't match the declared image/PDF type", () => {
    // The classic bypass attempt: rename/relabel a script-bearing file as an
    // allowed type and hope nothing checks the actual bytes.
    expect(() => assertUploadAllowed("image/png", SVG_WITH_SCRIPT)).toThrow();
    expect(() => assertUploadAllowed("application/pdf", SVG_WITH_SCRIPT)).toThrow();
  });
});
