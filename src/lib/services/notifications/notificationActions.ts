"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function markNotificationReadAction(notificationId: number) {
  const { companyId } = await requireTenant();
  await prisma.notification.updateMany({
    where: { id: notificationId, companyId },
    data: { isRead: true },
  });
  revalidatePath("/dashboard", "layout");
}

export async function markAllNotificationsReadAction() {
  const { companyId } = await requireTenant();
  await prisma.notification.updateMany({
    where: { companyId, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/dashboard", "layout");
}
