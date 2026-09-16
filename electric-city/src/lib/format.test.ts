import { describe, it, expect } from "vitest";
import { formatDate, verdictBadgeClass, statusBadgeClass } from "./format";

describe("formatDate", () => {
  it("returns an em dash for null/undefined", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });

  it("formats with the en-GB locale by default", () => {
    expect(formatDate("2026-03-05")).toBe("5 Mar 2026");
  });

  it("formats with the el-GR locale when requested", () => {
    // Greek month abbreviations differ from English ones, so this also
    // guards against the locale argument silently being ignored.
    expect(formatDate("2026-03-05", "el")).not.toBe(formatDate("2026-03-05", "en"));
  });

  it("accepts a Date instance as well as a string", () => {
    expect(formatDate(new Date("2026-01-01"), "en")).toBe("1 Jan 2026");
  });
});

describe("verdictBadgeClass", () => {
  it("maps each verdict to a distinct badge class", () => {
    expect(verdictBadgeClass("APPROVED")).toBe("badge badge-approved");
    expect(verdictBadgeClass("NEEDS_REVISION")).toBe("badge badge-revision");
    expect(verdictBadgeClass("FLAGGED")).toBe("badge badge-flagged");
  });

  it("falls back to neutral for an unrecognized or missing verdict", () => {
    expect(verdictBadgeClass(undefined)).toBe("badge badge-neutral");
    expect(verdictBadgeClass("SOMETHING_ELSE")).toBe("badge badge-neutral");
  });
});

describe("statusBadgeClass", () => {
  it("maps each phase status to a distinct badge class", () => {
    expect(statusBadgeClass("DONE")).toBe("badge badge-approved");
    expect(statusBadgeClass("NEEDS_REVISION")).toBe("badge badge-flagged");
    expect(statusBadgeClass("SUBMITTED")).toBe("badge badge-revision");
    expect(statusBadgeClass("LOCKED")).toBe("badge badge-locked");
  });

  it("falls back to neutral for TODO/IN_PROGRESS/unknown", () => {
    expect(statusBadgeClass("TODO")).toBe("badge badge-neutral");
    expect(statusBadgeClass("IN_PROGRESS")).toBe("badge badge-neutral");
    expect(statusBadgeClass("SOMETHING_ELSE")).toBe("badge badge-neutral");
  });
});
