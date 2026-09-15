import type { Locale } from "@/lib/i18n/dictionary";

// Locale is always passed explicitly (never inferred from the environment)
// so server render and browser hydration agree, regardless of either
// environment's own locale/timezone settings.
export function formatDate(date: Date | string | null | undefined, locale: Locale = "en") {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(locale === "el" ? "el-GR" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function verdictBadgeClass(verdict: string | undefined) {
  switch (verdict) {
    case "APPROVED":
      return "badge badge-approved";
    case "NEEDS_REVISION":
      return "badge badge-revision";
    case "FLAGGED":
      return "badge badge-flagged";
    default:
      return "badge badge-neutral";
  }
}

export function statusBadgeClass(status: string) {
  switch (status) {
    case "DONE":
      return "badge badge-approved";
    case "NEEDS_REVISION":
      return "badge badge-flagged";
    case "SUBMITTED":
      return "badge badge-revision";
    case "LOCKED":
      return "badge badge-locked";
    default:
      return "badge badge-neutral";
  }
}
