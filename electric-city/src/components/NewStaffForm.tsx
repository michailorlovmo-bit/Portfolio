"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { useI18n } from "@/lib/i18n/client";

export default function NewStaffForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STAFF" | "MANAGER">("STAFF");
  const [category, setCategory] = useState("");
  const [subcontractorName, setSubcontractorName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        role,
        category: category || null,
        subcontractorName: subcontractorName.trim() || null,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : t.newStaffForm.errorGeneric);
      return;
    }

    setName("");
    setEmail("");
    setPassword("");
    setRole("STAFF");
    setCategory("");
    setSubcontractorName("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
        {t.staffPage.addAccount}
      </button>
    );
  }

  return (
    <div className="card p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t.newStaffForm.name}</label>
            <input required className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">{t.newStaffForm.email}</label>
            <input
              required
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">{t.newStaffForm.tempPassword}</label>
            <input
              required
              minLength={8}
              type="text"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t.newStaffForm.role}</label>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as "STAFF" | "MANAGER")}
            >
              <option value="STAFF">{t.newStaffForm.staffOption}</option>
              <option value="MANAGER">{t.newStaffForm.managerOption}</option>
            </select>
          </div>
          <div>
            <label className="label">{t.newStaffForm.category}</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">{t.common.none}</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.labelEl} ({c.labelEn})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">{t.newStaffForm.subcontractor}</label>
          <input
            className="input"
            placeholder={t.newStaffForm.subcontractorPlaceholder}
            value={subcontractorName}
            onChange={(e) => setSubcontractorName(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? t.newStaffForm.creating : t.newStaffForm.createAccount}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
