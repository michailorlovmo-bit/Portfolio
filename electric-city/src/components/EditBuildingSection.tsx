"use client";

import { useState } from "react";
import BuildingForm, { BuildingFormValues } from "@/components/BuildingForm";
import { useI18n } from "@/lib/i18n/client";

export default function EditBuildingSection({
  buildingId,
  initialValues,
}: {
  buildingId: string;
  initialValues: BuildingFormValues;
}) {
  const [editing, setEditing] = useState(false);
  const { t } = useI18n();

  if (!editing) {
    return (
      <button className="btn-secondary" onClick={() => setEditing(true)}>
        {t.buildingDetail.editBuilding}
      </button>
    );
  }

  return (
    <BuildingForm
      mode="edit"
      buildingId={buildingId}
      initialValues={initialValues}
      onDone={() => setEditing(false)}
      onCancel={() => setEditing(false)}
    />
  );
}
