"use client";

import { useI18n } from "@/lib/i18n/client";

function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");
}

export default function ExportCsvButton({
  rows,
  filename,
  className = "btn-secondary",
}: {
  rows: (string | number)[][];
  filename: string;
  className?: string;
}) {
  const { t } = useI18n();

  function handleExport() {
    const csv = "﻿" + toCsv(rows); // BOM so Excel opens UTF-8 (Greek text) correctly
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className={className} onClick={handleExport}>
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
      </svg>
      {t.common.exportCsv}
    </button>
  );
}
