"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { useToast } from "@/lib/toast/context";

export default function DuplicateBuildingButton({ buildingId }: { buildingId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleDuplicate() {
    setLoading(true);
    const res = await fetch(`/api/buildings/${buildingId}/duplicate`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      showToast(t.toast.actionFailed, "error");
      return;
    }
    const { building } = await res.json();
    showToast(t.toast.buildingCreated);
    router.push(`/buildings/${building.id}`);
  }

  return (
    <button className="btn-secondary" disabled={loading} onClick={handleDuplicate}>
      {loading ? t.common.saving : t.buildingDetail.duplicate}
    </button>
  );
}
