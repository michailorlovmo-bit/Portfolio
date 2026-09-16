import { describe, it, expect, afterEach } from "vitest";
import { isDriveConfigured, buildingFolderName, driveFileName, deleteFileFromDrive } from "./googleDrive";

describe("isDriveConfigured", () => {
  const originalJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const originalFolder = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  afterEach(() => {
    if (originalJson === undefined) delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    else process.env.GOOGLE_SERVICE_ACCOUNT_JSON = originalJson;
    if (originalFolder === undefined) delete process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    else process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = originalFolder;
  });

  it("is false when neither env var is set", () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    expect(isDriveConfigured()).toBe(false);
  });

  it("is false when only one of the two env vars is set", () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = "{}";
    delete process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    expect(isDriveConfigured()).toBe(false);

    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = "folder123";
    expect(isDriveConfigured()).toBe(false);
  });

  it("is true only once both are set", () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = "{}";
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = "folder123";
    expect(isDriveConfigured()).toBe(true);
  });
});

describe("buildingFolderName", () => {
  it("appends a short id suffix to disambiguate same-named buildings", () => {
    expect(buildingFolderName("Egnatia 45", "cmu2ft9vf0004s4u8mc287bxm")).toBe(
      "Egnatia 45 (287bxm)"
    );
  });

  it("replaces path-separator characters that would confuse a synced local folder", () => {
    expect(buildingFolderName("Block A/B", "id123456")).toBe("Block A-B (123456)");
    expect(buildingFolderName("C:\\Site", "id123456")).toBe("C:-Site (123456)");
  });

  it("trims stray whitespace so it can't create near-duplicate folders", () => {
    expect(buildingFolderName("  Egnatia 45  ", "id123456")).toBe("Egnatia 45 (123456)");
  });
});

describe("driveFileName", () => {
  it("prefixes the original filename with the category's English label", () => {
    expect(driveFileName("SURVEY", "entrance.png")).toBe("Site Survey - entrance.png");
    expect(driveFileName("SPLICING", "splice-report.pdf")).toBe("Splicing - splice-report.pdf");
  });

  it("sanitizes the filename the same way folder names are sanitized", () => {
    expect(driveFileName("EARTHWORKS", "weird/name.jpg")).toBe("Earthworks - weird-name.jpg");
  });
});

describe("deleteFileFromDrive", () => {
  it("resolves without throwing when Drive isn't configured, instead of erroring the local delete", async () => {
    // No GOOGLE_SERVICE_ACCOUNT_JSON in this test environment — this must
    // stay a true no-op, since removing a file locally should never fail
    // just because the Drive mirror is unreachable or was never set up.
    await expect(deleteFileFromDrive("some-drive-file-id")).resolves.toBeUndefined();
  });
});
