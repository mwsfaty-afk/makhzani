import { prisma } from "@/lib/db/prisma";

const RECENT_LIMIT = 15;

export async function getNotificationsSummary(companyId: number) {
  const [unreadCount, recent] = await Promise.all([
    prisma.notification.count({ where: { companyId, isRead: false } }),
    prisma.notification.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
    }),
  ]);

  return { unreadCount, recent };
}
