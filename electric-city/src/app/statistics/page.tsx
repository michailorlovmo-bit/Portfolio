import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, categoryDef } from "@/lib/categories";
import { getDictionary } from "@/lib/i18n/server";
import ExportCsvButton from "@/components/ExportCsvButton";

interface Bucket {
  total: number;
  done: number;
  aboutToComplete: number; // SUBMITTED — turned in, awaiting/pending final verdict
  inProgress: number; // TODO / IN_PROGRESS
  needsAttention: number; // NEEDS_REVISION (includes AI-flagged submissions)
  locked: number;
  overdue: number;
}

function emptyBucket(): Bucket {
  return { total: 0, done: 0, aboutToComplete: 0, inProgress: 0, needsAttention: 0, locked: 0, overdue: 0 };
}

function tally(bucket: Bucket, status: string, isOverdue: boolean) {
  bucket.total += 1;
  if (isOverdue) bucket.overdue += 1;
  if (status === "DONE") bucket.done += 1;
  else if (status === "SUBMITTED") bucket.aboutToComplete += 1;
  else if (status === "NEEDS_REVISION") bucket.needsAttention += 1;
  else if (status === "LOCKED") bucket.locked += 1;
  else bucket.inProgress += 1; // TODO, IN_PROGRESS
}

export default async function StatisticsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { t } = await getDictionary();

  // Always re-check against the database rather than trusting the session
  // token — this page is restricted to a small, deliberately-granted circle
  // and a permission change should take effect without waiting on a re-login.
  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me || !me.canViewStats) redirect("/buildings");

  const [buildings, phaseTasks] = await Promise.all([
    prisma.building.findMany({
      include: { phaseTasks: { select: { status: true } } },
    }),
    prisma.phaseTask.findMany({
      include: {
        assignedTo: {
          select: { id: true, name: true, role: true, category: true, subcontractorName: true },
        },
      },
    }),
  ]);

  const now = new Date();

  const buildingStats = {
    total: buildings.length,
    completed: buildings.filter((b) => b.phaseTasks.every((t) => t.status === "DONE")).length,
    awaitingTelekom: buildings.filter((b) => !b.telekomApprovedAt).length,
    needsAttention: buildings.filter((b) => b.phaseTasks.some((t) => t.status === "NEEDS_REVISION"))
      .length,
  };

  const byCategory = new Map<string, Bucket>(CATEGORIES.map((c) => [c.key, emptyBucket()]));
  const byPerson = new Map<
    string,
    { name: string; role: string; category: string | null; subcontractorName: string | null; bucket: Bucket }
  >();
  // "" is the in-house bucket (subcontractorName === null); every other key
  // is a subcontractor company name.
  const bySubcontractor = new Map<string, Bucket>([["", emptyBucket()]]);

  for (const task of phaseTasks) {
    const isOverdue = !!task.dueDate && task.dueDate < now && task.status !== "DONE" && task.status !== "LOCKED";

    const catBucket = byCategory.get(task.category);
    if (catBucket) tally(catBucket, task.status, isOverdue);

    if (task.assignedTo) {
      if (!byPerson.has(task.assignedTo.id)) {
        byPerson.set(task.assignedTo.id, {
          name: task.assignedTo.name,
          role: task.assignedTo.role,
          category: task.assignedTo.category,
          subcontractorName: task.assignedTo.subcontractorName,
          bucket: emptyBucket(),
        });
      }
      tally(byPerson.get(task.assignedTo.id)!.bucket, task.status, isOverdue);

      const subKey = task.assignedTo.subcontractorName || "";
      if (!bySubcontractor.has(subKey)) bySubcontractor.set(subKey, emptyBucket());
      tally(bySubcontractor.get(subKey)!, task.status, isOverdue);
    }
  }

  const people = Array.from(byPerson.values()).sort((a, b) => b.bucket.total - a.bucket.total);
  const subcontractors = Array.from(bySubcontractor.entries())
    .map(([name, bucket]) => ({ name, bucket }))
    .sort((a, b) => (a.name === "" ? -1 : b.name === "" ? 1 : b.bucket.total - a.bucket.total));

  const categoryCsvHeader = [
    t.statisticsPage.colCategory,
    t.statisticsPage.colTotalPhases,
    t.statisticsPage.colDone,
    t.statisticsPage.colAboutToComplete,
    t.statisticsPage.colInProgress,
    t.statisticsPage.colNeedsAttention,
    t.statisticsPage.colLocked,
    t.statisticsPage.colOverdue,
  ];
  const categoryCsvRows: (string | number)[][] = [
    categoryCsvHeader,
    ...CATEGORIES.map((c) => {
      const b = byCategory.get(c.key)!;
      return [`${c.labelEl} (${c.labelEn})`, b.total, b.done, b.aboutToComplete, b.inProgress, b.needsAttention, b.locked, b.overdue];
    }),
  ];

  const personCsvHeader = [
    t.statisticsPage.colPerson,
    t.statisticsPage.colCategory,
    t.statisticsPage.colSubcontractor,
    t.statisticsPage.colAssigned,
    t.statisticsPage.colDone,
    t.statisticsPage.colAboutToComplete,
    t.statisticsPage.colInProgress,
    t.statisticsPage.colNeedsAttention,
    t.statisticsPage.colOverdue,
  ];
  const personCsvRows: (string | number)[][] = [
    personCsvHeader,
    ...people.map((p) => [
      p.name,
      p.category ? categoryDef(p.category).labelEl : "",
      p.subcontractorName || t.statisticsPage.inHouse,
      p.bucket.total,
      p.bucket.done,
      p.bucket.aboutToComplete,
      p.bucket.inProgress,
      p.bucket.needsAttention,
      p.bucket.overdue,
    ]),
  ];

  const subcontractorCsvHeader = [
    t.statisticsPage.colSubcontractor,
    t.statisticsPage.colTotalPhases,
    t.statisticsPage.colDone,
    t.statisticsPage.colAboutToComplete,
    t.statisticsPage.colInProgress,
    t.statisticsPage.colNeedsAttention,
    t.statisticsPage.colLocked,
    t.statisticsPage.colOverdue,
  ];
  const subcontractorCsvRows: (string | number)[][] = [
    subcontractorCsvHeader,
    ...subcontractors.map((s) => [
      s.name || t.statisticsPage.inHouse,
      s.bucket.total,
      s.bucket.done,
      s.bucket.aboutToComplete,
      s.bucket.inProgress,
      s.bucket.needsAttention,
      s.bucket.locked,
      s.bucket.overdue,
    ]),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">{t.statisticsPage.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{t.statisticsPage.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={t.statisticsPage.cardBuildings} value={buildingStats.total} tone="brand" />
        <StatCard label={t.statisticsPage.cardCompleted} value={buildingStats.completed} tone="approved" />
        <StatCard label={t.statisticsPage.cardNeedsAttention} value={buildingStats.needsAttention} tone="flagged" />
        <StatCard label={t.statisticsPage.cardAwaitingTelekom} value={buildingStats.awaitingTelekom} tone="neutral" />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">{t.statisticsPage.byCategory}</h2>
          <ExportCsvButton rows={categoryCsvRows} filename="statistics-by-category.csv" />
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colCategory}</th>
                <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colTotalPhases}</th>
                <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colDone}</th>
                <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colAboutToComplete}</th>
                <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colInProgress}</th>
                <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colNeedsAttention}</th>
                <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colLocked}</th>
                <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colOverdue}</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c) => {
                const b = byCategory.get(c.key)!;
                return (
                  <tr key={c.key} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {c.labelEl} <span className="font-normal text-slate-400">({c.labelEn})</span>
                    </td>
                    <td className="px-4 py-2.5">{b.total}</td>
                    <td className="px-4 py-2.5 text-emerald-700">{b.done}</td>
                    <td className="px-4 py-2.5 text-amber-700">{b.aboutToComplete}</td>
                    <td className="px-4 py-2.5 text-slate-600">{b.inProgress}</td>
                    <td className="px-4 py-2.5 text-rose-700">{b.needsAttention}</td>
                    <td className="px-4 py-2.5 text-slate-400">{b.locked}</td>
                    <td className="px-4 py-2.5 text-rose-700">{b.overdue}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">{t.statisticsPage.bySubcontractor}</h2>
          <ExportCsvButton rows={subcontractorCsvRows} filename="statistics-by-subcontractor.csv" />
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colSubcontractor}</th>
                <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colTotalPhases}</th>
                <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colDone}</th>
                <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colAboutToComplete}</th>
                <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colInProgress}</th>
                <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colNeedsAttention}</th>
                <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colLocked}</th>
                <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colOverdue}</th>
              </tr>
            </thead>
            <tbody>
              {subcontractors.map((s) => (
                <tr key={s.name || "__inhouse__"} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {s.name || t.statisticsPage.inHouse}
                  </td>
                  <td className="px-4 py-2.5">{s.bucket.total}</td>
                  <td className="px-4 py-2.5 text-emerald-700">{s.bucket.done}</td>
                  <td className="px-4 py-2.5 text-amber-700">{s.bucket.aboutToComplete}</td>
                  <td className="px-4 py-2.5 text-slate-600">{s.bucket.inProgress}</td>
                  <td className="px-4 py-2.5 text-rose-700">{s.bucket.needsAttention}</td>
                  <td className="px-4 py-2.5 text-slate-400">{s.bucket.locked}</td>
                  <td className="px-4 py-2.5 text-rose-700">{s.bucket.overdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">{t.statisticsPage.byPerson}</h2>
          {people.length > 0 && (
            <ExportCsvButton rows={personCsvRows} filename="statistics-by-person.csv" />
          )}
        </div>
        {people.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-500">
            {t.statisticsPage.noAssignments}
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colPerson}</th>
                  <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colCategory}</th>
                  <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colSubcontractor}</th>
                  <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colAssigned}</th>
                  <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colDone}</th>
                  <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colAboutToComplete}</th>
                  <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colInProgress}</th>
                  <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colNeedsAttention}</th>
                  <th className="px-4 py-2.5 font-medium">{t.statisticsPage.colOverdue}</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {p.name}{" "}
                      <span className="badge badge-neutral ml-1">
                        {t.role[p.role as keyof typeof t.role]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {p.category ? categoryDef(p.category).labelEl : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {p.subcontractorName || t.statisticsPage.inHouse}
                    </td>
                    <td className="px-4 py-2.5">{p.bucket.total}</td>
                    <td className="px-4 py-2.5 text-emerald-700">{p.bucket.done}</td>
                    <td className="px-4 py-2.5 text-amber-700">{p.bucket.aboutToComplete}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.bucket.inProgress}</td>
                    <td className="px-4 py-2.5 text-rose-700">{p.bucket.needsAttention}</td>
                    <td className="px-4 py-2.5 text-rose-700">{p.bucket.overdue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "approved" | "flagged" | "brand";
}) {
  const toneClass =
    tone === "approved"
      ? "text-emerald-700"
      : tone === "flagged"
        ? "text-rose-700"
        : tone === "brand"
          ? "text-brand-700"
          : "text-slate-900";
  const borderClass =
    tone === "approved"
      ? "border-l-emerald-400"
      : tone === "flagged"
        ? "border-l-rose-400"
        : tone === "brand"
          ? "border-l-brand-400"
          : "border-l-slate-300";
  return (
    <div className={`card border-l-4 p-4 ${borderClass}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-3xl font-semibold tracking-tight ${toneClass}`}>{value}</p>
    </div>
  );
}
