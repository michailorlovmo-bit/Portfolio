"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { useToast } from "@/lib/toast/context";

interface StaffOption {
  id: string;
  name: string;
  category: string | null;
  subcontractorName: string | null;
}

export default function AssignPhaseForm({
  phaseTaskId,
  staff,
  currentAssigneeId,
  taskCategory,
  currentDueDate,
}: {
  phaseTaskId: string;
  staff: StaffOption[];
  currentAssigneeId: string | null;
  taskCategory: string;
  currentDueDate: string | null;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [assigneeId, setAssigneeId] = useState(currentAssigneeId || "");
  const [dueDate, setDueDate] = useState(currentDueDate || "");
  const [loading, setLoading] = useState(false);

  const matching = staff.filter((s) => s.category === taskCategory);
  const others = staff.filter((s) => s.category !== taskCategory);

  async function handleSave() {
    setLoading(true);
    const res = await fetch(`/api/phase-tasks/${phaseTaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: assigneeId || null, dueDate: dueDate || null }),
    });
    setLoading(false);
    showToast(res.ok ? t.toast.assignmentSaved : t.toast.actionFailed, res.ok ? "success" : "error");
    router.refresh();
  }

  return (
    <div className="card space-y-3 p-5">
      <h3 className="font-medium text-slate-900">{t.assignForm.title}</h3>
      <div className="flex flex-wrap gap-2">
        <select
          className="input min-w-[160px] flex-1"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
        >
          <option value="">{t.common.unassigned}</option>
          {matching.length > 0 && (
            <optgroup label={t.assignForm.thisCategory}>
              {matching.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.subcontractorName ? ` (${s.subcontractorName})` : ""}
                </option>
              ))}
            </optgroup>
          )}
          {others.length > 0 && (
            <optgroup label={t.assignForm.otherStaff}>
              {others.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.subcontractorName ? ` (${s.subcontractorName})` : ""}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">{t.assignForm.due}</label>
          <input
            type="date"
            className="input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <button className="btn-primary" disabled={loading} onClick={handleSave}>
          {loading ? t.common.saving : t.common.save}
        </button>
      </div>
    </div>
  );
}
