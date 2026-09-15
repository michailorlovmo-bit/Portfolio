import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/dictionary";
import { categoryDef } from "@/lib/categories";
import { formatDate, statusBadgeClass, verdictBadgeClass } from "@/lib/format";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { t, locale } = await getDictionary();
  const isManager = session.user.role === "MANAGER";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">{tr(t.dashboard.greeting, { name: session.user.name || "" })}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isManager ? t.dashboard.managerSubtitle : t.dashboard.staffSubtitle}
        </p>
      </div>

      {isManager ? (
        <ManagerDashboard t={t} locale={locale} />
      ) : (
        <StaffDashboard t={t} locale={locale} userId={session.user.id} />
      )}
    </div>
  );
}

async function ManagerDashboard({
  t,
  locale,
}: {
  t: Awaited<ReturnType<typeof getDictionary>>["t"];
  locale: Awaited<ReturnType<typeof getDictionary>>["locale"];
}) {
  const [buildings, unassignedTasks, recentReviews] = await Promise.all([
    prisma.building.findMany({
      where: { archived: false },
      include: { phaseTasks: { select: { status: true, dueDate: true } } },
    }),
    prisma.phaseTask.findMany({
      where: { assignedToId: null, status: { not: "LOCKED" }, building: { archived: false } },
      include: { building: { select: { id: true, name: true } } },
      orderBy: { building: { name: "asc" } },
      take: 10,
    }),
    prisma.phaseReview.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { phaseTask: { include: { building: { select: { id: true, name: true } } } } },
    }),
  ]);

  const now = new Date();
  const needsAttention = buildings.filter((b) => b.phaseTasks.some((pt) => pt.status === "NEEDS_REVISION")).length;
  const overdue = buildings.filter((b) =>
    b.phaseTasks.some((pt) => pt.dueDate && pt.dueDate < now && pt.status !== "DONE" && pt.status !== "LOCKED")
  ).length;
  const awaitingTelekom = buildings.filter((b) => !b.telekomApprovedAt).length;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatLink
          href="/buildings?filter=needs-attention"
          label={t.dashboard.needsAttention}
          value={needsAttention}
          tone="flagged"
        />
        <StatLink href="/buildings?filter=overdue" label={t.dashboard.overdue} value={overdue} tone="flagged" />
        <StatLink
          href="/buildings?filter=awaiting-telekom"
          label={t.dashboard.awaitingTelekom}
          value={awaitingTelekom}
          tone="neutral"
        />
      </div>

      <div>
        <h2 className="section-title mb-3">{t.dashboard.unassignedPhases}</h2>
        {unassignedTasks.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-500">{t.dashboard.unassignedEmpty}</div>
        ) : (
          <div className="space-y-2">
            {unassignedTasks.map((task) => (
              <Link
                key={task.id}
                href={`/buildings/${task.building.id}`}
                className="card-link flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className={statusBadgeClass(task.status)}>{t.status[task.status as keyof typeof t.status]}</span>
                  <span className="text-sm text-slate-700">
                    {categoryDef(task.category).labelEl}{" "}
                    <span className="text-slate-400">({categoryDef(task.category).labelEn})</span>
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-900">{task.building.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="section-title mb-3">{t.dashboard.recentActivity}</h2>
        {recentReviews.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-500">{t.dashboard.recentActivityEmpty}</div>
        ) : (
          <div className="card divide-y divide-slate-100">
            {recentReviews.map((review) => (
              <Link
                key={review.id}
                href={`/buildings/${review.phaseTask.building.id}`}
                className="flex flex-wrap items-center justify-between gap-2 p-3 transition-colors hover:bg-slate-50/60"
              >
                <div className="flex items-center gap-2">
                  <span className={verdictBadgeClass(review.verdict)}>{t.verdict[review.verdict as keyof typeof t.verdict]}</span>
                  <span className="text-sm text-slate-700">
                    {review.phaseTask.building.name} ·{" "}
                    {tr(t.buildingDetail.activityReview, { category: categoryDef(review.phaseTask.category).labelEl })}
                  </span>
                </div>
                <span className="flex-shrink-0 text-xs text-slate-400">{formatDate(review.createdAt, locale)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

async function StaffDashboard({
  t,
  locale,
  userId,
}: {
  t: Awaited<ReturnType<typeof getDictionary>>["t"];
  locale: Awaited<ReturnType<typeof getDictionary>>["locale"];
  userId: string;
}) {
  const tasks = await prisma.phaseTask.findMany({
    where: {
      assignedToId: userId,
      status: { in: ["TODO", "IN_PROGRESS", "NEEDS_REVISION"] },
      building: { archived: false },
    },
    include: { building: { select: { id: true, name: true } } },
  });

  const now = new Date();
  const sorted = [...tasks].sort((a, b) => {
    const rank = (t: (typeof tasks)[number]) => {
      if (t.status === "NEEDS_REVISION") return 0;
      if (t.dueDate && t.dueDate < now) return 1;
      return 2;
    };
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  return (
    <div>
      <h2 className="section-title mb-3">{t.dashboard.myTasks}</h2>
      {sorted.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">{t.dashboard.myTasksEmpty}</div>
      ) : (
        <div className="space-y-2">
          {sorted.map((task) => {
            const overdue = !!task.dueDate && task.dueDate < now;
            return (
              <Link key={task.id} href={`/phase-tasks/${task.id}`} className="card-link block p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{task.building.name}</p>
                    <p className="text-sm text-slate-500">
                      {categoryDef(task.category).labelEl}{" "}
                      <span className="text-slate-400">({categoryDef(task.category).labelEn})</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={statusBadgeClass(task.status)}>{t.status[task.status as keyof typeof t.status]}</span>
                    {task.dueDate && (
                      <span className={`badge ${overdue ? "badge-flagged" : "badge-neutral"}`}>
                        {tr(t.phaseTask.due, { date: formatDate(task.dueDate, locale) })}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatLink({
  href,
  label,
  value,
  tone = "neutral",
}: {
  href: string;
  label: string;
  value: number;
  tone?: "neutral" | "flagged";
}) {
  const toneClass = tone === "flagged" ? "text-rose-700" : "text-slate-900";
  const borderClass = tone === "flagged" ? "border-l-rose-400" : "border-l-slate-300";
  return (
    <Link href={href} className={`card-link block border-l-4 p-4 ${borderClass}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-3xl font-semibold tracking-tight ${toneClass}`}>{value}</p>
    </Link>
  );
}
