import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TelekomApproveButton from "@/components/TelekomApproveButton";
import EditBuildingSection from "@/components/EditBuildingSection";
import ArchiveBuildingButton from "@/components/ArchiveBuildingButton";
import DuplicateBuildingButton from "@/components/DuplicateBuildingButton";
import { categoryDef } from "@/lib/categories";
import { statusBadgeClass, verdictBadgeClass, formatDate } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/dictionary";

export default async function BuildingDetailPage({
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
          assignedTo: { select: { id: true, name: true, subcontractorName: true } },
          reviews: { orderBy: { createdAt: "desc" } },
        },
      },
      telekomApprovedBy: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });

  if (!building) notFound();

  type ActivityEvent = { date: Date; label: string; tone: "neutral" | "approved" | "revision" | "flagged" };
  const activity: ActivityEvent[] = [
    { date: building.createdAt, label: tr(t.buildingDetail.activityCreated, { name: building.createdBy.name }), tone: "neutral" },
  ];
  if (building.telekomApprovedAt) {
    activity.push({
      date: building.telekomApprovedAt,
      label: tr(t.buildingDetail.activityTelekomCleared, { name: building.telekomApprovedBy?.name || "" }),
      tone: "neutral",
    });
  }
  for (const task of building.phaseTasks) {
    for (const review of task.reviews) {
      activity.push({
        date: review.createdAt,
        label: `${tr(t.buildingDetail.activityReview, { category: categoryDef(task.category).labelEl })}: ${t.verdict[review.verdict as keyof typeof t.verdict]}`,
        tone: review.verdict === "APPROVED" ? "approved" : review.verdict === "FLAGGED" ? "flagged" : "revision",
      });
    }
  }
  activity.sort((a, b) => b.date.getTime() - a.date.getTime());

  const isManager = session.user.role === "MANAGER";
  const isAssignedSomewhere = building.phaseTasks.some(
    (t) => t.assignedToId === session.user.id
  );
  if (!isManager && !isAssignedSomewhere) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">{building.name}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {building.address ? `${building.address} · ` : ""}
            {building.totalFloors}{" "}
            {building.totalFloors === 1 ? t.buildings.floorSingular : t.buildings.floorPlural}
          </p>
          <div className="mt-2 flex max-w-xs items-center gap-2">
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${
                    building.phaseTasks.length
                      ? (building.phaseTasks.filter((t) => t.status === "DONE").length /
                          building.phaseTasks.length) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
            <span className="flex-shrink-0 text-xs text-slate-400">
              {building.phaseTasks.filter((t) => t.status === "DONE").length}/
              {building.phaseTasks.length}
            </span>
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-wrap gap-2">
          <Link href={`/buildings/${building.id}/report`} className="btn-secondary">
            {t.buildingDetail.printReport}
          </Link>
          {isManager && (
            <>
            <EditBuildingSection
              buildingId={building.id}
              initialValues={{
                name: building.name,
                address: building.address || "",
                totalFloors: String(building.totalFloors),
                bepEntries: building.bepEntries.map((e) => e.label),
                bmoEntries: building.bmoEntries.map((e) => e.label),
                cableEntries: building.cableEntries.map((e) => e.label),
                floorBoxes: building.floorBoxes.map((fb) => ({
                  floorNumber: String(fb.floorNumber),
                  quantity: String(fb.quantity),
                  type: fb.type || "",
                  notes: fb.notes || "",
                })),
              }}
            />
            <DuplicateBuildingButton buildingId={building.id} />
            <ArchiveBuildingButton buildingId={building.id} archived={building.archived} />
            </>
          )}
        </div>
      </div>

      {building.archived && (
        <div className="card border-l-4 border-l-slate-400 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">{t.buildingDetail.archivedBanner}</p>
        </div>
      )}

      {isManager && (
        <TelekomApproveButton
          buildingId={building.id}
          approvedAt={building.telekomApprovedAt?.toISOString() || null}
          approvedByName={building.telekomApprovedBy?.name || null}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-4 p-5">
          <div>
            <h3 className="text-sm font-medium text-slate-500">{t.buildingDetail.bepEntries}</h3>
            {building.bepEntries.length ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-800">
                {building.bepEntries.map((e) => (
                  <li key={e.id}>{e.label}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-400">{t.common.noneSpecified}</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">{t.buildingDetail.bmoEntries}</h3>
            {building.bmoEntries.length ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-800">
                {building.bmoEntries.map((e) => (
                  <li key={e.id}>{e.label}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-400">{t.common.noneSpecified}</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">{t.buildingDetail.cables}</h3>
            {building.cableEntries.length ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-800">
                {building.cableEntries.map((e) => (
                  <li key={e.id}>{e.label}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-400">{t.common.noneSpecified}</p>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-2 text-sm font-medium text-slate-500">{t.buildingDetail.floorBoxes}</h3>
          {building.floorBoxes.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
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
                      <td className="py-1.5 pr-2">{fb.floorNumber}</td>
                      <td className="py-1.5 pr-2">{fb.quantity}</td>
                      <td className="py-1.5 pr-2">{fb.type || "—"}</td>
                      <td className="py-1.5">{fb.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400">{t.common.noneSpecified}</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="section-title mb-3">{t.buildingDetail.phases}</h2>
        <div className="space-y-3">
          {building.phaseTasks.map((task) => {
            const def = categoryDef(task.category);
            const lastReview = task.reviews[0];
            return (
              <Link key={task.id} href={`/phase-tasks/${task.id}`} className="card-link flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      task.status === "DONE"
                        ? "bg-emerald-100 text-emerald-700"
                        : task.status === "LOCKED"
                          ? "bg-slate-100 text-slate-400"
                          : "bg-brand-100 text-brand-700"
                    }`}
                  >
                    {def.order}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">{def.labelEl}</span>
                      <span className="text-xs text-slate-400">({def.labelEn})</span>
                      <span className={statusBadgeClass(task.status)}>{t.status[task.status as keyof typeof t.status]}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {task.assignedTo
                        ? task.assignedTo.subcontractorName
                          ? tr(t.buildingDetail.assignedToSubcontractor, {
                              name: task.assignedTo.name,
                              subcontractor: task.assignedTo.subcontractorName,
                            })
                          : tr(t.buildingDetail.assignedTo, { name: task.assignedTo.name })
                        : t.common.unassigned}
                    </p>
                  </div>
                </div>
                {lastReview && (
                  <span className={`${verdictBadgeClass(lastReview.verdict)} flex-shrink-0`}>
                    {t.verdict[lastReview.verdict as keyof typeof t.verdict]}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="section-title mb-3">{t.buildingDetail.activity}</h2>
        <div className="card divide-y divide-slate-100">
          {activity.map((event, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-3">
              <span
                className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                  event.tone === "approved"
                    ? "bg-emerald-500"
                    : event.tone === "flagged"
                      ? "bg-rose-500"
                      : event.tone === "revision"
                        ? "bg-amber-500"
                        : "bg-slate-300"
                }`}
              />
              <div className="flex-1">
                <p className="text-sm text-slate-800">{event.label}</p>
                <p className="text-xs text-slate-400">{formatDate(event.date, locale)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
