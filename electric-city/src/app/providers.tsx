"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/dictionary";
import { ToastProvider } from "@/lib/toast/context";

export default function Providers({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  return (
    <SessionProvider>
      <I18nProvider initialLocale={initialLocale}>
        <ToastProvider>{children}</ToastProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
