"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

export default function ChangePasswordForm() {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError(t.changePassword.mismatchError);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : t.changePassword.errorGeneric);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
  }

  return (
    <div className="card max-w-md space-y-4 p-5">
      <h2 className="font-medium text-slate-900">{t.changePassword.title}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">{t.changePassword.currentPassword}</label>
          <input
            required
            type="password"
            className="input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t.changePassword.newPassword}</label>
          <input
            required
            minLength={8}
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t.changePassword.confirmNewPassword}</label>
          <input
            required
            minLength={8}
            type="password"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{t.changePassword.passwordChanged}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? t.common.saving : t.changePassword.changePassword}
        </button>
      </form>
    </div>
  );
}
