import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import SignOutButton from "@/components/SignOutButton";
import NotificationBell from "@/components/NotificationBell";
import LanguageToggle from "@/components/LanguageToggle";

export default async function NavBar() {
  const session = await getServerSession(authOptions);
  const { t } = await getDictionary();
  if (!session) return null;

  const isManager = session.user.role === "MANAGER";

  return (
    <header className="no-print sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/" className="flex items-center gap-2 font-semibold text-brand-700">
            <Image
              src="/logo.jpg"
              alt=""
              width={56}
              height={56}
              className="rounded-md shadow-sm ring-1 ring-slate-900/5"
            />
            <span className="text-lg">{t.app.name}</span>
          </Link>
          <nav className="flex flex-wrap gap-x-1 gap-y-1 text-sm text-slate-600">
            <Link href="/" className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 hover:text-slate-900">
              {t.nav.dashboard}
            </Link>
            <Link href="/buildings" className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 hover:text-slate-900">
              {t.nav.buildings}
            </Link>
            {isManager && (
              <>
                <Link href="/staff" className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 hover:text-slate-900">
                  {t.nav.staff}
                </Link>
                <Link
                  href="/settings/checklists"
                  className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  {t.nav.checklists}
                </Link>
              </>
            )}
            {session.user.canViewStats && (
              <Link href="/statistics" className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 hover:text-slate-900">
                {t.nav.statistics}
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 sm:gap-3">
          <LanguageToggle />
          <NotificationBell />
          <Link
            href="/account"
            className="whitespace-nowrap rounded-md px-1.5 py-1 transition-colors hover:bg-slate-100"
          >
            <span className="hidden sm:inline">{session.user.name} </span>
            <span className="badge badge-neutral">{t.role[session.user.role]}</span>
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
