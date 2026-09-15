"use client";

import { signOut } from "next-auth/react";
import { useI18n } from "@/lib/i18n/client";

export default function SignOutButton() {
  const { t } = useI18n();
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="btn-secondary"
    >
      {t.nav.signOut}
    </button>
  );
}
