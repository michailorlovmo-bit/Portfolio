"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { useToast } from "@/lib/toast/context";
import ConfirmButton from "@/components/ConfirmButton";

export default function StatsAccessToggle({
  userId,
  canViewStats,
}: {
  userId: string;
  canViewStats: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canViewStats: !canViewStats }),
    });
    setLoading(false);
    if (res.ok) {
      showToast(canViewStats ? t.toast.statsRevoked : t.toast.statsGranted);
    } else {
      showToast(t.toast.actionFailed, "error");
    }
    router.refresh();
  }

  if (!canViewStats) {
    return (
      <button
        className="text-xs text-slate-500 hover:underline disabled:opacity-50"
        disabled={loading}
        onClick={toggle}
      >
        {t.staffPage.grantStats}
      </button>
    );
  }

  return <ConfirmButton onConfirm={toggle} label={t.staffPage.revokeStats} disabled={loading} />;
}
