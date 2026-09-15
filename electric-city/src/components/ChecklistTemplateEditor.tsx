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

  return (
    <div className="card space-y-3 p-5">
      <h3 className="font-medium text-slate-900">
        {labelEl} <span className="text-sm font-normal text-slate-400">({labelEn})</span>
      </h3>
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-800">{item.label}</span>
              <ConfirmButton
                onConfirm={() => removeItem(item.id)}
                label={t.common.remove}
                className="text-xs text-rose-600 hover:underline"
                disabled={loading}
              />
            </li>
          ))}
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
