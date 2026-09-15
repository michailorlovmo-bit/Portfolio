import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewStaffForm from "@/components/NewStaffForm";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title">{t.staffPage.title}</h1>
        <NewStaffForm />
      </div>

      <div className="card divide-y divide-slate-100">
        {users.map((u) => (
          <div
            key={u.id}
            className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3 transition-opacity ${
              u.active ? "" : "opacity-60"
            }`}
          >
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
        ))}
      </div>
    </div>
  );
}
