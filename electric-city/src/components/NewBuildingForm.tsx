"use client";

import { useState } from "react";
import BuildingForm, { emptyBuildingFormValues } from "@/components/BuildingForm";
import { useI18n } from "@/lib/i18n/client";

export default function NewBuildingForm() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
        {t.buildings.newBuilding}
      </button>
    );
  }

  return (
    <BuildingForm
      mode="create"
      initialValues={emptyBuildingFormValues}
      onDone={() => setOpen(false)}
      onCancel={() => setOpen(false)}
    />
  );
}
