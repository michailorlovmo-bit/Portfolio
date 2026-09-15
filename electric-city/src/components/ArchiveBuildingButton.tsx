"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { useToast } from "@/lib/toast/context";
import ConfirmButton from "@/components/ConfirmButton";

export default function ArchiveBuildingButton({
  buildingId,
  archived,
}: {
  buildingId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch(`/api/buildings/${buildingId}/archive`, {
      method: archived ? "DELETE" : "POST",
    });
    setLoading(false);
    if (res.ok) {
      showToast(archived ? t.toast.buildingUnarchived : t.toast.buildingArchived);
      router.refresh();
      if (!archived) router.push("/buildings");
    } else {
      showToast(t.toast.actionFailed, "error");
    }
  }

  if (archived) {
    return (
      <button className="btn-secondary" disabled={loading} onClick={toggle}>
        {t.common.unarchive}
      </button>
    );
  }

  return (
    <ConfirmButton
      onConfirm={toggle}
      label={t.common.archive}
      className="btn-secondary"
      confirmClassName="btn-secondary border-rose-300 text-rose-600"
      disabled={loading}
    />
  );
}
