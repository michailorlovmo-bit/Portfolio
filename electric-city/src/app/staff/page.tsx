import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewStaffForm from "@/components/NewStaffForm";
import EditStaffForm from "@/components/EditStaffForm";
import StaffActiveToggle from "@/components/StaffActiveToggle";
import StatsAccessToggle from "@/components/StatsAccessToggle";
import { formatDate } from "@/lib/format";
import { categoryDef } from "@/lib/categories";
import { getDictionary } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/dictionary";

export default async function StaffPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "MANAGER") redirect("/buildings");
  const { t, locale } = await getDictionary();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  const existingSubcontractors = Array.from(
    new Set(users.map((u) => u.subcontractorName).filter((n): n is string => !!n))
  ).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title">{t.staffPage.title}</h1>
        <div className="flex flex-wrap gap-2">
          <a href="/api/backup" className="btn-secondary">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>
            {t.staffPage.downloadBackup}
          </a>
          <NewStaffForm />
        </div>
      </div>

      <datalist id="subcontractor-options">
        {existingSubcontractors.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <div className="card divide-y divide-slate-100">
        {users.map((u) => (
          <div
            key={u.id}
            className={`px-5 py-3 transition-opacity ${u.active ? "" : "opacity-60"}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    {u.name}
                    {!u.active && <span className="ml-2 badge badge-locked">{t.staffPage.deactivated}</span>}
                    {u.canViewStats && (
                      <span className="ml-2 badge badge-neutral">{t.staffPage.statisticsBadge}</span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500">{u.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="badge badge-neutral">{t.role[u.role as keyof typeof t.role]}</span>
                {u.category && (
                  <span className="badge badge-neutral">{categoryDef(u.category).labelEl}</span>
                )}
                {u.subcontractorName && (
                  <span className="badge badge-revision">
                    {tr(t.staffPage.subcontractorBadge, { name: u.subcontractorName })}
                  </span>
                )}
                <span>{tr(t.staffPage.joined, { date: formatDate(u.createdAt, locale) })}</span>
                {u.id !== session.user.id && (
                  <>
                    <StaffActiveToggle userId={u.id} active={u.active} />
                    {session.user.canViewStats && (
                      <StatsAccessToggle userId={u.id} canViewStats={u.canViewStats} />
                    )}
                  </>
                )}
              </div>
            </div>
            {u.id !== session.user.id && (
              <EditStaffForm
                userId={u.id}
                initialName={u.name}
                initialCategory={u.category}
                initialSubcontractorName={u.subcontractorName}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
