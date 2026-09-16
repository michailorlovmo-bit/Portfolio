import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PhaseSubmitPanel from "@/components/PhaseSubmitPanel";
import ManagerPhaseOverride from "@/components/ManagerPhaseOverride";
import AssignPhaseForm from "@/components/AssignPhaseForm";
import { categoryDef } from "@/lib/categories";
import { formatDate, statusBadgeClass, verdictBadgeClass } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/dictionary";

interface ChecklistResult {
  label: string;
  satisfied: boolean;
  note: string;
}

export default async function PhaseTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { t, locale } = await getDictionary();

  const { id } = await params;

  const task = await prisma.phaseTask.findUnique({
    where: { id },
    include: {
      building: {
        include: {
          bepEntries: true,
          bmoEntries: true,
          cableEntries: true,
          floorBoxes: { orderBy: { floorNumber: "asc" } },
        },
      },
      assignedTo: { select: { id: true, name: true, subcontractorName: true } },
      checklistItems: { orderBy: { order: "asc" } },
      files: { orderBy: { createdAt: "desc" } },
      reviews: { orderBy: { createdAt: "desc" } },
      testReadings: true,
    },
  });

  if (!task) notFound();

  const isManager = session.user.role === "MANAGER";
  const isAssignee = task.assignedToId === session.user.id;
  if (!isManager && !isAssignee) notFound();

  const staff = isManager
    ? await prisma.user.findMany({
        where: { role: "STAFF", active: true },
        select: { id: true, name: true, category: true, subcontractorName: true },
        orderBy: { name: "asc" },
      })
    : [];

  const def = categoryDef(task.category);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/buildings/${task.buildingId}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m15 18-6-6 6-6" />
          </svg>
          {task.building.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {def.order}
          </span>
          <h1 className="page-title">
            {def.labelEl} <span className="text-base font-normal text-slate-400">({def.labelEn})</span>
          </h1>
          <span className={statusBadgeClass(task.status)}>
            {t.status[task.status as keyof typeof t.status]}
          </span>
        </div>
        <p className="mt-1.5 pl-12 text-sm text-slate-500">
          {task.assignedTo
            ? task.assignedTo.subcontractorName
              ? tr(t.phaseTask.assignedToSubcontractor, {
                  name: task.assignedTo.name,
                  subcontractor: task.assignedTo.subcontractorName,
                })
              : tr(t.phaseTask.assignedTo, { name: task.assignedTo.name })
            : t.common.unassigned}
          {task.dueDate && (
            <>
              {" · "}
              <span
                className={
                  task.dueDate < new Date() && task.status !== "DONE"
                    ? "font-medium text-rose-600"
                    : ""
                }
              >
                {tr(t.phaseTask.due, { date: formatDate(task.dueDate, locale) })}
              </span>
            </>
          )}
        </p>
      </div>

      <details className="card overflow-hidden">
        <summary className="cursor-pointer select-none p-5 text-sm font-medium text-slate-900">
          {t.phaseTask.buildingSpec}
        </summary>
        <div className="grid gap-4 border-t border-slate-100 p-5 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {t.buildingDetail.bepEntries}
              </h4>
              {task.building.bepEntries.length ? (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-800">
                  {task.building.bepEntries.map((e) => (
                    <li key={e.id}>{e.label}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-slate-400">{t.common.noneSpecified}</p>
              )}
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {t.buildingDetail.bmoEntries}
              </h4>
              {task.building.bmoEntries.length ? (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-800">
                  {task.building.bmoEntries.map((e) => (
                    <li key={e.id}>{e.label}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-slate-400">{t.common.noneSpecified}</p>
              )}
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {t.buildingDetail.cables}
              </h4>
              {task.building.cableEntries.length ? (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-800">
                  {task.building.cableEntries.map((e) => (
                    <li key={e.id}>{e.label}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-slate-400">{t.common.noneSpecified}</p>
              )}
            </div>
          </div>
          <div>
            <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              {t.buildingDetail.floorBoxes}
            </h4>
            {task.building.floorBoxes.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="pb-1 pr-2 font-medium">{t.buildingDetail.colFloor}</th>
                      <th className="pb-1 pr-2 font-medium">{t.buildingDetail.colQty}</th>
                      <th className="pb-1 pr-2 font-medium">{t.buildingDetail.colType}</th>
                      <th className="pb-1 font-medium">{t.buildingDetail.colNotes}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {task.building.floorBoxes.map((fb) => (
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
      </details>

      {task.checklistItems.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-2 text-sm font-medium text-slate-500">{t.phaseTask.checklist}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
            {task.checklistItems.map((item) => (
              <li key={item.id}>{item.label}</li>
            ))}
          </ul>
        </div>
      )}

      {task.files.length > 0 && (
        <div className="card space-y-3 p-5">
          <h3 className="font-medium text-slate-900">{t.phaseTask.uploadedFiles}</h3>

          {task.files.some((f) => f.mimeType.startsWith("image/")) && (
            <div className="flex flex-wrap gap-3">
              {task.files
                .filter((f) => f.mimeType.startsWith("image/"))
                .map((f) => (
                  <a
                    key={f.id}
                    href={`/api/phase-tasks/${task.id}/files/${f.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-lg border border-slate-200 shadow-sm transition-transform hover:scale-[1.03]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/phase-tasks/${task.id}/files/${f.id}`}
                      alt={f.filename}
                      className="h-28 w-28 object-cover"
                    />
                  </a>
                ))}
            </div>
          )}

          <ul className="space-y-1 text-sm">
            {task.files.map((f) => (
              <li key={f.id}>
                <a
                  className="text-brand-700 hover:underline"
                  href={`/api/phase-tasks/${task.id}/files/${f.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {f.filename}
                </a>
                <span className="ml-2 text-xs text-slate-400">
                  {(f.size / 1024).toFixed(0)} KB
                </span>
                {f.driveViewLink && (
                  <a
                    className="ml-2 text-xs text-brand-700 hover:underline"
                    href={f.driveViewLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t.phaseTask.viewInDrive}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {task.testReadings.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-2 text-sm font-medium text-slate-500">{t.phaseTask.testReadings}</h3>
          <ul className="space-y-1 text-sm text-slate-800">
            {task.testReadings.map((r) => (
              <li key={r.id}>
                {r.label}: <span className="font-medium">{r.value}</span>
                {r.unit ? ` ${r.unit}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {task.reviews.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-slate-900">{t.phaseTask.aiReviewHistory}</h3>
          {task.reviews.map((r) => {
            let checklistResults: ChecklistResult[] = [];
            try {
              checklistResults = JSON.parse(r.checklistResults);
            } catch {
              checklistResults = [];
            }
            return (
              <div key={r.id} className="card space-y-2 p-5">
                <div className="flex items-center justify-between">
                  <span className={verdictBadgeClass(r.verdict)}>
                    {t.verdict[r.verdict as keyof typeof t.verdict]}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDate(r.createdAt, locale)} &middot; {r.model}
                  </span>
                </div>
                <p className="font-medium text-slate-800">{r.summary}</p>
                <p className="whitespace-pre-wrap text-sm text-slate-600">{r.feedback}</p>
                {r.filesNote && (
                  <p className="whitespace-pre-wrap text-sm italic text-slate-500">{r.filesNote}</p>
                )}
                {checklistResults.length > 0 && (
                  <ul className="space-y-1 border-t border-slate-100 pt-2 text-sm">
                    {checklistResults.map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className={c.satisfied ? "text-emerald-600" : "text-rose-600"}>
                          {c.satisfied ? "✓" : "✗"}
                        </span>
                        <span>
                          <span className="text-slate-800">{c.label}</span>
                          {c.note && <span className="text-slate-500"> — {c.note}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isAssignee && task.status !== "DONE" && task.status !== "LOCKED" && (
        <PhaseSubmitPanel
          phaseTaskId={task.id}
          checklist={task.checklistItems.map((c) => c.label)}
          existingFiles={task.files.map((f) => ({ id: f.id, filename: f.filename }))}
          existingReadings={task.testReadings.map((r) => ({
            label: r.label,
            value: r.value,
            unit: r.unit,
          }))}
        />
      )}

      {isManager && (
        <AssignPhaseForm
          phaseTaskId={task.id}
          staff={staff}
          currentAssigneeId={task.assignedToId}
          taskCategory={task.category}
          currentDueDate={task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null}
        />
      )}

      {isManager && task.status !== "LOCKED" && (
        <ManagerPhaseOverride phaseTaskId={task.id} currentStatus={task.status} />
      )}
    </div>
  );
}
