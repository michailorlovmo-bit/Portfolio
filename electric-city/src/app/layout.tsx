import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import NavBar from "@/components/NavBar";
import { getLocale } from "@/lib/i18n/server";

const inter = Inter({ subsets: ["latin", "greek"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Electric City",
  description: "Electric City fiber build task management with AI-assisted review",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Electric City",
  },
};

export const viewport: Viewport = {
  themeColor: "#2445e8",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body className={inter.variable}>
        <Providers initialLocale={locale}>
          <div className="flex min-h-screen flex-col">
            <NavBar />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
