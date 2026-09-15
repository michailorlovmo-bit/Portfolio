"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { tr } from "@/lib/i18n/dictionary";

interface FileItem {
  id: string;
  filename: string;
}

interface ReadingRow {
  label: string;
  value: string;
  unit: string;
}

export default function PhaseSubmitPanel({
  phaseTaskId,
  checklist,
  existingFiles,
  existingReadings,
}: {
  phaseTaskId: string;
  checklist: string[];
  existingFiles: FileItem[];
  existingReadings: { label: string; value: string; unit: string | null }[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState("");
  const [readings, setReadings] = useState<ReadingRow[]>(
    existingReadings.map((r) => ({ label: r.label, value: r.value, unit: r.unit || "" }))
  );
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState(existingFiles);

  async function handleUpload() {
    const selected = fileInputRef.current?.files;
    if (!selected || selected.length === 0) return;

    setUploading(true);
    setError(null);

    for (const file of Array.from(selected)) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/phase-tasks/${phaseTaskId}/files`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || tr(t.submitPanel.uploadFailed, { name: file.name }));
        setUploading(false);
        return;
      }
      const { file: uploaded } = await res.json();
      setFiles((prev) => [...prev, { id: uploaded.id, filename: uploaded.filename }]);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(false);
    router.refresh();
  }

  function updateReading(i: number, field: keyof ReadingRow, value: string) {
    const next = [...readings];
    next[i] = { ...next[i], [field]: value };
    setReadings(next);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/phase-tasks/${phaseTaskId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes,
        readings: readings
          .filter((r) => r.label.trim() && r.value.trim())
          .map((r) => ({ label: r.label, value: r.value, unit: r.unit || undefined })),
      }),
    });

    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || t.submitPanel.submissionFailed);
      router.refresh();
      return;
    }

    router.refresh();
  }

  return (
    <div className="card space-y-4 border-l-4 border-l-brand-400 p-5">
      <h3 className="font-medium text-slate-900">{t.submitPanel.title}</h3>

      {checklist.length > 0 && (
        <div>
          <label className="label">{t.submitPanel.checklistForThisPhase}</label>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            {checklist.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label className="label">{t.submitPanel.files}</label>
        {files.length > 0 && (
          <ul className="mb-2 space-y-1 text-sm text-slate-600">
            {files.map((f) => (
              <li key={f.id}>{f.filename}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf,text/plain,text/csv,application/json"
            className="max-w-full text-sm"
          />
          <button
            type="button"
            className="btn-secondary whitespace-nowrap"
            disabled={uploading}
            onClick={handleUpload}
          >
            {uploading ? t.submitPanel.uploading : t.submitPanel.addFiles}
          </button>
        </div>
      </div>

      <div>
        <label className="label">{t.submitPanel.testReadingsOptional}</label>
        <div className="space-y-2">
          {readings.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-2 gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2 sm:grid-cols-12 sm:border-0 sm:bg-transparent sm:p-0"
            >
              <input
                className="input col-span-2 sm:col-span-5"
                placeholder={t.submitPanel.labelPlaceholder}
                value={r.label}
                onChange={(e) => updateReading(i, "label", e.target.value)}
              />
              <input
                className="input sm:col-span-3"
                placeholder={t.submitPanel.valuePlaceholder}
                value={r.value}
                onChange={(e) => updateReading(i, "value", e.target.value)}
              />
              <input
                className="input sm:col-span-3"
                placeholder={t.submitPanel.unitPlaceholder}
                value={r.unit}
                onChange={(e) => updateReading(i, "unit", e.target.value)}
              />
              <button
                type="button"
                className="btn-secondary col-span-2 sm:col-span-1"
                onClick={() => setReadings(readings.filter((_, idx) => idx !== i))}
              >
                {t.common.remove}
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setReadings([...readings, { label: "", value: "", unit: "" }])}
          >
            {t.submitPanel.addReading}
          </button>
        </div>
      </div>

      <div>
        <label className="label">{t.submitPanel.notesLabel}</label>
        <textarea
          rows={3}
          className="input"
          placeholder={t.submitPanel.notesPlaceholder}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        type="button"
        className="btn-primary"
        disabled={submitting}
        onClick={handleSubmit}
      >
        {submitting ? t.submitPanel.submitting : t.submitPanel.submit}
      </button>
    </div>
  );
}
