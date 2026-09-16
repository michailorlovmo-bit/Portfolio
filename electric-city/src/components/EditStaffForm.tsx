"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { useI18n } from "@/lib/i18n/client";
import { useToast } from "@/lib/toast/context";

export default function EditStaffForm({
  userId,
  initialName,
  initialCategory,
  initialSubcontractorName,
}: {
  userId: string;
  initialName: string;
  initialCategory: string | null;
  initialSubcontractorName: string | null;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(initialCategory || "");
  const [subcontractorName, setSubcontractorName] = useState(initialSubcontractorName || "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        category: category || null,
        subcontractorName: subcontractorName.trim() || null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : t.toast.actionFailed);
      return;
    }
    showToast(t.toast.staffUpdated);
    setOpen(false);
    router.refresh();
  }

  function handleCancel() {
    setName(initialName);
    setCategory(initialCategory || "");
    setSubcontractorName(initialSubcontractorName || "");
    setError(null);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        className="mt-2 inline-block text-xs text-slate-500 hover:underline"
        onClick={() => setOpen(true)}
      >
        {t.staffPage.edit}
      </button>
    );
  }

  return (
    <div className="mt-3 w-full space-y-2 border-t border-slate-100 pt-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          className="input"
          aria-label={t.newStaffForm.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="input"
          aria-label={t.newStaffForm.category}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">{t.common.none}</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.labelEl} ({c.labelEn})
            </option>
          ))}
        </select>
        <input
          className="input"
          list="subcontractor-options"
          aria-label={t.newStaffForm.subcontractor}
          placeholder={t.newStaffForm.subcontractorPlaceholder}
          value={subcontractorName}
          onChange={(e) => setSubcontractorName(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-primary" disabled={loading} onClick={handleSave}>
          {loading ? t.common.saving : t.common.save}
        </button>
        <button type="button" className="btn-secondary" onClick={handleCancel}>
          {t.common.cancel}
        </button>
      </div>
    </div>
  );
}
