import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categoryDef } from "@/lib/categories";
import { statusBadgeClass, verdictBadgeClass, formatDate } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/dictionary";
import PrintButton from "@/components/PrintButton";

interface ChecklistResult {
  label: string;
  satisfied: boolean;
  note: string;
}

export default async function BuildingReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { t, locale } = await getDictionary();

  const { id } = await params;

  const building = await prisma.building.findUnique({
    where: { id },
    include: {
      bepEntries: true,
      bmoEntries: true,
      cableEntries: true,
      floorBoxes: { orderBy: { floorNumber: "asc" } },
      phaseTasks: {
        orderBy: { orderIndex: "asc" },
        include: {
          assignedTo: { select: { id: true, name: true } },
          checklistItems: { orderBy: { order: "asc" } },
          files: { orderBy: { createdAt: "desc" } },
          testReadings: true,
          reviews: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      telekomApprovedBy: { select: { name: true } },
    },
  });

  if (!building) notFound();

  const isManager = session.user.role === "MANAGER";
  const isAssignedSomewhere = building.phaseTasks.some((t) => t.assignedToId === session.user.id);
  if (!isManager && !isAssignedSomewhere) notFound();

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <Link href={`/buildings/${building.id}`} className="text-sm font-medium text-brand-700 hover:underline">
          ← {building.name}
        </Link>
        <PrintButton label={t.buildingDetail.printReport} />
      </div>

      <div>
        <h1 className="page-title">{building.name}</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {building.address ? `${building.address} · ` : ""}
          {building.totalFloors}{" "}
          {building.totalFloors === 1 ? t.buildings.floorSingular : t.buildings.floorPlural}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {formatDate(new Date(), locale)}
          {building.telekomApprovedAt &&
            ` · ${tr(t.telekom.clearedOn, { date: formatDate(building.telekomApprovedAt, locale) })}${building.telekomApprovedBy ? tr(t.telekom.clearedBy, { name: building.telekomApprovedBy.name }) : ""}`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3 p-5">
          <div>
            <h3 className="text-sm font-medium text-slate-500">{t.buildingDetail.bepEntries}</h3>
            <p className="text-sm text-slate-800">
              {building.bepEntries.map((e) => e.label).join("; ") || t.common.noneSpecified}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">{t.buildingDetail.bmoEntries}</h3>
            <p className="text-sm text-slate-800">
              {building.bmoEntries.map((e) => e.label).join("; ") || t.common.noneSpecified}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">{t.buildingDetail.cables}</h3>
            <p className="text-sm text-slate-800">
              {building.cableEntries.map((e) => e.label).join("; ") || t.common.noneSpecified}
            </p>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="mb-2 text-sm font-medium text-slate-500">{t.buildingDetail.floorBoxes}</h3>
          {building.floorBoxes.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-1 pr-2 font-medium">{t.buildingDetail.colFloor}</th>
                  <th className="pb-1 pr-2 font-medium">{t.buildingDetail.colQty}</th>
                  <th className="pb-1 pr-2 font-medium">{t.buildingDetail.colType}</th>
                  <th className="pb-1 font-medium">{t.buildingDetail.colNotes}</th>
                </tr>
              </thead>
              <tbody>
                {building.floorBoxes.map((fb) => (
                  <tr key={fb.id} className="border-t border-slate-100">
                    <td className="py-1">{fb.floorNumber}</td>
                    <td className="py-1">{fb.quantity}</td>
                    <td className="py-1">{fb.type || "—"}</td>
                    <td className="py-1">{fb.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-400">{t.common.noneSpecified}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="section-title">{t.buildingDetail.phases}</h2>
        {building.phaseTasks.map((task) => {
          const def = categoryDef(task.category);
          const review = task.reviews[0];
          let checklistResults: ChecklistResult[] = [];
          if (review) {
            try {
              checklistResults = JSON.parse(review.checklistResults);
            } catch {
              checklistResults = [];
            }
          }
          const images = task.files.filter((f) => f.mimeType.startsWith("image/"));

          return (
            <div key={task.id} className="card space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">
                    {def.order}. {def.labelEl} <span className="font-normal text-slate-400">({def.labelEn})</span>
                  </span>
                  <span className={statusBadgeClass(task.status)}>
                    {t.status[task.status as keyof typeof t.status]}
                  </span>
                </div>
                <span className="text-sm text-slate-500">
                  {task.assignedTo
                    ? tr(t.buildingDetail.assignedTo, { name: task.assignedTo.name })
                    : t.common.unassigned}
                </span>
              </div>

              {task.checklistItems.length > 0 && (
                <div>
                  <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t.phaseTask.checklist}
                  </h4>
                  <ul className="space-y-0.5 text-sm">
                    {task.checklistItems.map((item) => {
                      const result = checklistResults.find((r) => r.label === item.label);
                      return (
                        <li key={item.id} className="flex items-start gap-2">
                          {result && (
                            <span className={result.satisfied ? "text-emerald-600" : "text-rose-600"}>
                              {result.satisfied ? "✓" : "✗"}
                            </span>
                          )}
                          <span className="text-slate-700">{item.label}</span>
                          {result?.note && <span className="text-slate-400"> — {result.note}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {task.testReadings.length > 0 && (
                <div>
                  <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t.phaseTask.testReadings}
                  </h4>
                  <p className="text-sm text-slate-700">
                    {task.testReadings.map((r) => `${r.label}: ${r.value}${r.unit ? ` ${r.unit}` : ""}`).join("; ")}
                  </p>
                </div>
              )}

              {review && (
                <div>
                  <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t.phaseTask.aiReviewHistory}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className={verdictBadgeClass(review.verdict)}>
                      {t.verdict[review.verdict as keyof typeof t.verdict]}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(review.createdAt, locale)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{review.summary}</p>
                </div>
              )}

              {images.length > 0 && (
                <div>
                  <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t.phaseTask.uploadedFiles}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {images.map((f) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={f.id}
                        src={`/api/phase-tasks/${task.id}/files/${f.id}`}
                        alt={f.filename}
                        className="h-24 w-24 rounded-md border border-slate-200 object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
