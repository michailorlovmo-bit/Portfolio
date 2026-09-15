"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import LanguageToggle from "@/components/LanguageToggle";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError(t.auth.invalidCredentials);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative -mx-4 -my-8 flex min-h-[calc(100vh-1px)] items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-white to-slate-50 px-4 py-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(55,99,244,0.12), transparent 40%), radial-gradient(circle at 85% 80%, rgba(55,99,244,0.10), transparent 40%)",
        }}
      />
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="card p-8 shadow-xl shadow-slate-900/10">
          <div className="mb-1 flex items-center gap-3">
            <Image
              src="/logo.jpg"
              alt=""
              width={44}
              height={44}
              className="rounded-lg shadow-sm ring-1 ring-slate-900/5"
            />
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{t.app.name}</h1>
          </div>
          <p className="mb-6 text-sm text-slate-500">{t.auth.signInToYourAccount}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t.auth.email}</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t.auth.password}</label>
              <input
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? t.auth.signingIn : t.auth.signIn}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
