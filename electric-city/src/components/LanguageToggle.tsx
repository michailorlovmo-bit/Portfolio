"use client";

import { useI18n } from "@/lib/i18n/client";

export default function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex overflow-hidden rounded-md border border-slate-200 text-xs font-medium">
      <button
        onClick={() => setLocale("en")}
        className={`px-2 py-1 transition-colors ${
          locale === "en" ? "bg-brand-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLocale("el")}
        className={`px-2 py-1 transition-colors ${
          locale === "el" ? "bg-brand-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
        }`}
      >
        ΕΛ
      </button>
    </div>
  );
}
