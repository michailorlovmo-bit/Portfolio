"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { useToast } from "@/lib/toast/context";
import ConfirmButton from "@/components/ConfirmButton";

interface Item {
  id: string;
  label: string;
}

export default function ChecklistTemplateEditor({
  category,
  labelEl,
  labelEn,
  items,
}: {
  category: string;
  labelEl: string;
  labelEn: string;
  items: Item[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [newLabel, setNewLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  async function addItem() {
    if (!newLabel.trim()) return;
    setLoading(true);
    const res = await fetch("/api/checklist-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, label: newLabel.trim() }),
    });
    setNewLabel("");
    setLoading(false);
    showToast(res.ok ? t.toast.checklistItemAdded : t.toast.actionFailed, res.ok ? "success" : "error");
    router.refresh();
  }

  async function removeItem(id: string) {
    setLoading(true);
    const res = await fetch(`/api/checklist-templates/${id}`, { method: "DELETE" });
    setLoading(false);
    showToast(res.ok ? t.toast.checklistItemRemoved : t.toast.actionFailed, res.ok ? "success" : "error");
    router.refresh();
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setEditValue(item.label);
  }

  async function saveEdit(id: string) {
    if (!editValue.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/checklist-templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: editValue.trim() }),
    });
    setLoading(false);
    showToast(res.ok ? t.toast.checklistItemUpdated : t.toast.actionFailed, res.ok ? "success" : "error");
    if (res.ok) setEditingId(null);
    router.refresh();
  }

  return (
    <div className="card space-y-3 p-5">
      <h3 className="font-medium text-slate-900">
        {labelEl} <span className="text-sm font-normal text-slate-400">({labelEn})</span>
      </h3>
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item) =>
            editingId === item.id ? (
              <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm">
                <input
                  className="input min-w-[160px] flex-1"
                  aria-label={t.checklistEditor.editItemLabel}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveEdit(item.id);
                    } else if (e.key === "Escape") {
                      setEditingId(null);
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="text-xs font-medium text-brand-700 hover:underline"
                  disabled={loading}
                  onClick={() => saveEdit(item.id)}
                >
                  {t.common.save}
                </button>
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:underline"
                  onClick={() => setEditingId(null)}
                >
                  {t.common.cancel}
                </button>
              </li>
            ) : (
              <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-800">{item.label}</span>
                <span className="flex flex-shrink-0 items-center gap-3">
                  <button
                    type="button"
                    className="text-xs text-slate-500 hover:underline"
                    onClick={() => startEdit(item)}
                  >
                    {t.common.edit}
                  </button>
                  <ConfirmButton
                    onConfirm={() => removeItem(item.id)}
                    label={t.common.remove}
                    className="text-xs text-rose-600 hover:underline"
                    disabled={loading}
                  />
                </span>
              </li>
            )
          )}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">{t.checklistEditor.noItemsYet}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          className="input min-w-[160px] flex-1"
          placeholder={t.checklistEditor.addItemPlaceholder}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <button className="btn-secondary" disabled={loading} onClick={addItem}>
          {t.common.add}
        </button>
      </div>
    </div>
  );
}
