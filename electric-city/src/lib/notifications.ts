import { prisma } from "@/lib/prisma";

export async function notifyUser(userId: string, message: string, link?: string) {
  await prisma.notification.create({
    data: { userId, message, link: link || null },
  });
}

export async function notifyManagers(message: string, link?: string) {
  const managers = await prisma.user.findMany({
    where: { role: "MANAGER" },
    select: { id: true },
  });
  if (managers.length === 0) return;
  await prisma.notification.createMany({
    data: managers.map((m) => ({ userId: m.id, message, link: link || null })),
  });
}
