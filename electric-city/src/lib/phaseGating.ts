import { prisma } from "@/lib/prisma";
import { CATEGORIES, categoryDef, categoryLabel } from "@/lib/categories";
import { notifyUser } from "@/lib/notifications";

// The core pipeline rule, pulled out as a pure function so it can be unit
// tested without a database: a phase unlocks once its predecessor is Done
// AND (if this phase requires it) Telekom has cleared the building.
export function shouldPhaseUnlock(params: {
  requiresTelekomApproval: boolean;
  telekomApproved: boolean;
  previousDone: boolean;
}): boolean {
  const telekomOk = !params.requiresTelekomApproval || params.telekomApproved;
  return params.previousDone && telekomOk;
}

// Recomputes LOCKED/TODO for every phase task of a building based on pipeline
// order + Telekom clearance. Never touches a phase already past TODO
// (IN_PROGRESS/SUBMITTED/DONE/NEEDS_REVISION) — those reflect real work done.
export async function recomputePhaseLocks(buildingId: string) {
  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) return;

  const tasks = await prisma.phaseTask.findMany({
    where: { buildingId },
    orderBy: { orderIndex: "asc" },
  });

  let previousDone = true; // first phase has no predecessor
  for (const task of tasks) {
    const def = categoryDef(task.category);
    const shouldUnlock = shouldPhaseUnlock({
      requiresTelekomApproval: def.requiresTelekomApproval,
      telekomApproved: building.telekomApprovedAt !== null,
      previousDone,
    });

    if (task.status === "LOCKED" && shouldUnlock) {
      await prisma.phaseTask.update({ where: { id: task.id }, data: { status: "TODO" } });
      if (task.assignedToId) {
        await notifyUser(
          task.assignedToId,
          `${categoryLabel(task.category)} is ready to start on "${building.name}".`,
          `/phase-tasks/${task.id}`
        );
      }
    } else if (task.status === "TODO" && !shouldUnlock) {
      await prisma.phaseTask.update({ where: { id: task.id }, data: { status: "LOCKED" } });
    }

    previousDone = task.status === "DONE";
  }
}

export async function createPhaseTasksForBuilding(buildingId: string) {
  const templates = await prisma.checklistTemplateItem.findMany({
    orderBy: { order: "asc" },
  });

  for (const def of CATEGORIES) {
    const items = templates.filter((t) => t.category === def.key);
    await prisma.phaseTask.create({
      data: {
        buildingId,
        category: def.key,
        orderIndex: def.order,
        status: def.order === 1 ? "TODO" : "LOCKED",
        checklistItems: {
          create: items.map((item) => ({ label: item.label, order: item.order })),
        },
      },
    });
  }
}
