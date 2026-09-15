"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { tr } from "@/lib/i18n/dictionary";
import { useToast } from "@/lib/toast/context";
import ConfirmButton from "@/components/ConfirmButton";

export default function ManagerPhaseOverride({
  phaseTaskId,
  currentStatus,
}: {
  phaseTaskId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function setStatus(status: string) {
    setLoading(true);
    const res = await fetch(`/api/phase-tasks/${phaseTaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    showToast(res.ok ? t.toast.statusUpdated : t.toast.actionFailed, res.ok ? "success" : "error");
    router.refresh();
  }

  return (
    <div className="card space-y-3 border-l-4 border-l-slate-300 p-5">
      <h3 className="font-medium text-slate-900">{t.managerOverride.title}</h3>
      <p className="text-sm text-slate-500">
        {tr(t.managerOverride.description, {
          status: t.status[currentStatus as keyof typeof t.status] || currentStatus,
        })}
      </p>
      <div className="flex flex-wrap gap-2">
        <button disabled={loading} className="btn-primary" onClick={() => setStatus("DONE")}>
          {t.managerOverride.markDone}
        </button>
        <button
          disabled={loading}
          className="btn-secondary"
          onClick={() => setStatus("NEEDS_REVISION")}
        >
          {t.managerOverride.sendBack}
        </button>
        <ConfirmButton
          onConfirm={() => setStatus("IN_PROGRESS")}
          label={t.managerOverride.reopen}
          className="btn-secondary"
          confirmClassName="btn-secondary border-rose-300 text-rose-600"
          disabled={loading}
        />
      </div>
    </div>
  );
}
