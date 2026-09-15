"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { useToast } from "@/lib/toast/context";

interface FloorBoxRow {
  floorNumber: string;
  quantity: string;
  type: string;
  notes: string;
}

export interface BuildingFormValues {
  name: string;
  address: string;
  totalFloors: string;
  bepEntries: string[];
  bmoEntries: string[];
  cableEntries: string[];
  floorBoxes: FloorBoxRow[];
}

export const emptyBuildingFormValues: BuildingFormValues = {
  name: "",
  address: "",
  totalFloors: "1",
  bepEntries: [],
  bmoEntries: [],
  cableEntries: [],
  floorBoxes: [],
};

function TextListEditor({
  label,
  placeholder,
  addLabel,
  removeLabel,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  addLabel: string;
  removeLabel: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <input
              className="input min-w-[160px] flex-1"
              placeholder={placeholder}
              value={v}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
            >
              {removeLabel}
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={() => onChange([...values, ""])}>
          {addLabel}
        </button>
      </div>
    </div>
  );
}

export default function BuildingForm({
  mode,
  buildingId,
  initialValues,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  buildingId?: string;
  initialValues: BuildingFormValues;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [values, setValues] = useState<BuildingFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function addFloorBoxRow() {
    setValues((v) => ({
      ...v,
      floorBoxes: [...v.floorBoxes, { floorNumber: "", quantity: "", type: "", notes: "" }],
    }));
  }

  function updateFloorBoxRow(i: number, field: keyof FloorBoxRow, value: string) {
    setValues((v) => {
      const next = [...v.floorBoxes];
      next[i] = { ...next[i], [field]: value };
      return { ...v, floorBoxes: next };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      name: values.name,
      address: values.address || undefined,
      totalFloors: Number(values.totalFloors),
      bepEntries: values.bepEntries.filter((v) => v.trim()),
      bmoEntries: values.bmoEntries.filter((v) => v.trim()),
      cableEntries: values.cableEntries.filter((v) => v.trim()),
      floorBoxes: values.floorBoxes
        .filter((r) => r.floorNumber.trim() && r.quantity.trim())
        .map((r) => ({
          floorNumber: Number(r.floorNumber),
          quantity: Number(r.quantity),
          type: r.type || undefined,
          notes: r.notes || undefined,
        })),
    };

    const res = await fetch(mode === "create" ? "/api/buildings" : `/api/buildings/${buildingId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (!res.ok) {
      setError(mode === "create" ? t.buildingForm.errorCreate : t.buildingForm.errorSave);
      return;
    }

    showToast(mode === "create" ? t.toast.buildingCreated : t.toast.buildingSaved);
    router.refresh();
    onDone();
  }

  return (
    <div className="card p-5">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="label">{t.buildingForm.name}</label>
            <input
              required
              className="input"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">{t.buildingForm.totalFloors}</label>
            <input
              required
              type="number"
              min={1}
              className="input"
              value={values.totalFloors}
              onChange={(e) => setValues((v) => ({ ...v, totalFloors: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="label">{t.buildingForm.address}</label>
          <input
            className="input"
            value={values.address}
            onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
          />
        </div>

        <div className="space-y-6 border-t border-slate-100 pt-5">
          <TextListEditor
            label={t.buildingForm.bep}
            placeholder={t.buildingForm.bepPlaceholder}
            addLabel={t.buildingForm.addBepEntry}
            removeLabel={t.common.remove}
            values={values.bepEntries}
            onChange={(bepEntries) => setValues((v) => ({ ...v, bepEntries }))}
          />
          <TextListEditor
            label={t.buildingForm.bmo}
            placeholder={t.buildingForm.bmoPlaceholder}
            addLabel={t.buildingForm.addBmoEntry}
            removeLabel={t.common.remove}
            values={values.bmoEntries}
            onChange={(bmoEntries) => setValues((v) => ({ ...v, bmoEntries }))}
          />
          <TextListEditor
            label={t.buildingForm.cables}
            placeholder={t.buildingForm.cablesPlaceholder}
            addLabel={t.buildingForm.addCableEntry}
            removeLabel={t.common.remove}
            values={values.cableEntries}
            onChange={(cableEntries) => setValues((v) => ({ ...v, cableEntries }))}
          />
        </div>

        <div className="border-t border-slate-100 pt-5">
          <label className="label">{t.buildingForm.floorBoxes}</label>
          <div className="space-y-2">
            {values.floorBoxes.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-2 gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2 sm:grid-cols-12 sm:border-0 sm:bg-transparent sm:p-0"
              >
                <input
                  className="input sm:col-span-2"
                  type="number"
                  placeholder={t.buildingForm.floorNumberPlaceholder}
                  value={row.floorNumber}
                  onChange={(e) => updateFloorBoxRow(i, "floorNumber", e.target.value)}
                />
                <input
                  className="input sm:col-span-2"
                  type="number"
                  placeholder={t.buildingForm.qtyPlaceholder}
                  value={row.quantity}
                  onChange={(e) => updateFloorBoxRow(i, "quantity", e.target.value)}
                />
                <input
                  className="input sm:col-span-3"
                  placeholder={t.buildingForm.typePlaceholder}
                  value={row.type}
                  onChange={(e) => updateFloorBoxRow(i, "type", e.target.value)}
                />
                <input
                  className="input sm:col-span-4"
                  placeholder={t.buildingForm.notesPlaceholder}
                  value={row.notes}
                  onChange={(e) => updateFloorBoxRow(i, "notes", e.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary col-span-2 sm:col-span-1"
                  onClick={() =>
                    setValues((v) => ({
                      ...v,
                      floorBoxes: v.floorBoxes.filter((_, idx) => idx !== i),
                    }))
                  }
                >
                  {t.common.remove}
                </button>
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={addFloorBoxRow}>
              {t.buildingForm.addFloor}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex gap-2 border-t border-slate-100 pt-5">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading
              ? mode === "create"
                ? t.buildingForm.creating
                : t.common.saving
              : mode === "create"
                ? t.buildingForm.createBuilding
                : t.buildingForm.saveChanges}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {t.common.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
