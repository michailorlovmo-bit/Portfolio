"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

// Inline confirm-in-place instead of a modal: click once to arm, click again
// (within a few seconds) to actually fire. Lighter weight than a dialog and
// works well on mobile where a modal overlay is more disruptive.
export default function ConfirmButton({
  onConfirm,
  label,
  confirmLabel,
  className = "text-xs text-slate-500 hover:underline",
  confirmClassName = "text-xs font-medium text-rose-600 hover:underline",
  disabled,
}: {
  onConfirm: () => void;
  label: string;
  confirmLabel?: string;
  className?: string;
  confirmClassName?: string;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [armed, setArmed] = useState(false);

  if (armed) {
    return (
      <button
        type="button"
        className={confirmClassName}
        disabled={disabled}
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
        onBlur={() => setArmed(false)}
        autoFocus
      >
        {confirmLabel || t.common.confirm}
      </button>
    );
  }

  return (
    <button type="button" className={className} disabled={disabled} onClick={() => setArmed(true)}>
      {label}
    </button>
  );
}
