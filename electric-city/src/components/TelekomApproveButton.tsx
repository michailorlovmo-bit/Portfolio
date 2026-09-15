"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { tr } from "@/lib/i18n/dictionary";
import { formatDate } from "@/lib/format";
import { categoryLabel } from "@/lib/categories";
import { useToast } from "@/lib/toast/context";
import ConfirmButton from "@/components/ConfirmButton";

export default function TelekomApproveButton({
  buildingId,
  approvedAt,
  approvedByName,
}: {
  buildingId: string;
  approvedAt: string | null;
  approvedByName: string | null;
}) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch(`/api/buildings/${buildingId}/telekom-approve`, {
      method: approvedAt ? "DELETE" : "POST",
    });
    setLoading(false);
    if (res.ok) {
      showToast(approvedAt ? t.toast.telekomUndone : t.toast.telekomCleared);
    } else {
      showToast(t.toast.actionFailed, "error");
    }
    router.refresh();
  }

  if (approvedAt) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-emerald-400 p-4">
        <p className="text-sm text-slate-600">
          {tr(t.telekom.clearedOn, { date: formatDate(approvedAt, locale) })}
          {approvedByName ? tr(t.telekom.clearedBy, { name: approvedByName }) : ""}.
        </p>
        <ConfirmButton
          onConfirm={toggle}
          label={t.telekom.undo}
          className="btn-secondary"
          confirmClassName="btn-secondary border-rose-300 text-rose-600"
          disabled={loading}
        />
      </div>
    );
  }

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-amber-400 p-4">
      <p className="text-sm text-slate-600">
        {tr(t.telekom.waiting, { category: categoryLabel("EARTHWORKS") })}
      </p>
      <button className="btn-primary" disabled={loading} onClick={toggle}>
        {loading ? t.common.saving : t.telekom.markCleared}
      </button>
    </div>
  );
}
