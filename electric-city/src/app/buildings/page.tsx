import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import NewBuildingForm from "@/components/NewBuildingForm";
import ExportCsvButton from "@/components/ExportCsvButton";
import { CATEGORIES, categoryDef } from "@/lib/categories";
import { statusBadgeClass, formatDate } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/dictionary";

type Filter = "all" | "awaiting-telekom" | "needs-attention" | "overdue" | "completed" | "archived";

export default async function BuildingsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { t, locale } = await getDictionary();

  const isManager = session.user.role === "MANAGER";
  const { filter: filterParam, q } = await searchParams;
  const filter = (filterParam as Filter) || "all";
  const query = (q || "").trim();

  const buildings = await prisma.building.findMany({
    where: {
      ...(isManager ? {} : { phaseTasks: { some: { assignedToId: session.user.id } } }),
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { address: { contains: query } },
            ],
          }
        : {}),
    },
    include: {
      phaseTasks: {
        orderBy: { orderIndex: "asc" },
        include: { assignedTo: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const withFlags = buildings.map((b) => ({
    building: b,
    awaitingTelekom: !b.telekomApprovedAt,
    needsAttention: b.phaseTasks.some((t) => t.status === "NEEDS_REVISION"),
    overdue: b.phaseTasks.some(
      (t) => t.dueDate && t.dueDate < now && t.status !== "DONE" && t.status !== "LOCKED"
    ),
    completed: b.phaseTasks.every((t) => t.status === "DONE"),
    doneCount: b.phaseTasks.filter((t) => t.status === "DONE").length,
    totalPhases: b.phaseTasks.length,
  }));

  const active = withFlags.filter((b) => !b.building.archived);
  const archivedList = withFlags.filter((b) => b.building.archived);

  const counts = {
    all: active.length,
    "awaiting-telekom": active.filter((b) => b.awaitingTelekom).length,
    "needs-attention": active.filter((b) => b.needsAttention).length,
    overdue: active.filter((b) => b.overdue).length,
    completed: active.filter((b) => b.completed).length,
    archived: archivedList.length,
  };

  const filtered =
    filter === "archived"
      ? archivedList
      : active.filter((b) => {
          if (filter === "awaiting-telekom") return b.awaitingTelekom;
          if (filter === "needs-attention") return b.needsAttention;
          if (filter === "overdue") return b.overdue;
          if (filter === "completed") return b.completed;
          return true;
        });

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: t.buildings.tabAll },
    { key: "awaiting-telekom", label: t.buildings.tabAwaitingTelekom },
    { key: "needs-attention", label: t.buildings.tabNeedsAttention },
    { key: "overdue", label: t.buildings.tabOverdue },
    { key: "completed", label: t.buildings.tabCompleted },
    { key: "archived", label: t.buildings.tabArchived },
  ];

  const csvRows: (string | number)[][] = [
    [
      "Name",
      "Address",
      "Total floors",
      "Telekom cleared",
      "Progress",
      ...CATEGORIES.map((c) => `${c.labelEl} (${c.labelEn})`),
    ],
    ...filtered.map(({ building, doneCount, totalPhases }) => [
      building.name,
      building.address || "",
      building.totalFloors,
      building.telekomApprovedAt ? formatDate(building.telekomApprovedAt, locale) : "",
      `${doneCount}/${totalPhases}`,
      ...CATEGORIES.map((c) => {
        const task = building.phaseTasks.find((pt) => pt.category === c.key);
        return task ? t.status[task.status as keyof typeof t.status] : "";
      }),
    ]),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title">{t.buildings.title}</h1>
        <div className="flex gap-2">
          {filtered.length > 0 && (
            <ExportCsvButton rows={csvRows} filename="buildings.csv" />
          )}
          {isManager && <NewBuildingForm />}
        </div>
      </div>

      <form action="/buildings" method="GET" className="flex gap-2">
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <div className="relative max-w-sm flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t.buildings.searchPlaceholder}
            className="input pl-9"
          />
        </div>
        <button type="submit" className="btn-secondary">
          {t.common.search}
        </button>
        {query && (
          <Link
            href={filter === "all" ? "/buildings" : `/buildings?filter=${filter}`}
            className="btn-secondary"
          >
            {t.common.clear}
          </Link>
        )}
      </form>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => {
          const href =
            tab.key === "all"
              ? query
                ? `/buildings?q=${encodeURIComponent(query)}`
                : "/buildings"
              : `/buildings?filter=${tab.key}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
          const active = filter === tab.key;
          return (
            <Link
              key={tab.key}
              href={href}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-brand-600 font-medium text-white shadow-sm shadow-brand-600/25"
                  : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label} <span className={active ? "text-brand-100" : "text-slate-400"}>({counts[tab.key]})</span>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <svg
            className="h-10 w-10 text-slate-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1" />
          </svg>
          <p className="text-sm text-slate-500">
            {buildings.length === 0
              ? query
                ? tr(t.buildings.emptyNoMatchQuery, { query })
                : t.buildings.emptyNone
              : t.buildings.emptyNoMatchFilter}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(({ building, awaitingTelekom, needsAttention, overdue, completed, doneCount, totalPhases }) => (
          <Link key={building.id} href={`/buildings/${building.id}`} className="card-link block p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-medium text-slate-900">{building.name}</h2>
                <p className="text-sm text-slate-500">
                  {building.address ? `${building.address} · ` : ""}
                  {building.totalFloors}{" "}
                  {building.totalFloors === 1 ? t.buildings.floorSingular : t.buildings.floorPlural}
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-wrap justify-end gap-2">
                {building.archived && <span className="badge badge-locked">{t.buildings.tabArchived}</span>}
                {completed && <span className="badge badge-approved">{t.buildings.badgeCompleted}</span>}
                {needsAttention && (
                  <span className="badge badge-flagged">{t.buildings.badgeNeedsAttention}</span>
                )}
                {overdue && <span className="badge badge-flagged">{t.buildings.badgeOverdue}</span>}
                {awaitingTelekom && (
                  <span className="badge badge-neutral">{t.buildings.badgeAwaitingTelekom}</span>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${totalPhases ? (doneCount / totalPhases) * 100 : 0}%` }}
                />
              </div>
              <span className="flex-shrink-0 text-xs text-slate-400">
                {doneCount}/{totalPhases}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const task = building.phaseTasks.find((t) => t.category === c.key);
                return (
                  <span key={c.key} className="flex items-center gap-1 text-xs text-slate-500">
                    <span className={statusBadgeClass(task?.status || "LOCKED")}>
                      {categoryDef(c.key).labelEl}
                    </span>
                    {task?.assignedTo && (
                      <span className="text-slate-400">({task.assignedTo.name})</span>
                    )}
                  </span>
                );
              })}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
