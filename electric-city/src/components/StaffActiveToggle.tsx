"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { tr } from "@/lib/i18n/dictionary";
import { useToast } from "@/lib/toast/context";
import ConfirmButton from "@/components/ConfirmButton";

export default function StaffActiveToggle({
  userId,
  active,
}: {
  userId: string;
  active: boolean;
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
      body: JSON.stringify({ active: !active }),
    });
    setLoading(false);
    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      if (active && body.unassignedTaskCount > 0) {
        showToast(tr(t.toast.staffDeactivatedTasksMoved, { count: String(body.unassignedTaskCount) }));
      } else {
        showToast(active ? t.toast.staffDeactivated : t.toast.staffReactivated);
      }
    } else {
      showToast(t.toast.actionFailed, "error");
    }
    router.refresh();
  }

  if (!active) {
    return (
      <button
        className="text-xs text-slate-500 hover:underline disabled:opacity-50"
        disabled={loading}
        onClick={toggle}
      >
        {t.staffPage.reactivate}
      </button>
    );
  }

  return <ConfirmButton onConfirm={toggle} label={t.staffPage.deactivate} disabled={loading} />;
}
