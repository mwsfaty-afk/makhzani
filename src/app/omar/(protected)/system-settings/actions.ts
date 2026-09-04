"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/adminSession";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/services/admin/auditLog";

const schema = z.object({
  baseCurrency: z.string().min(1),
  targetCurrency: z.string().min(1),
  rate: z.coerce.number().positive(),
});

/** أسعار صرف تقريبية للعرض فقط بجانب سعر الخطة الأساسي (docs/ARCHITECTURE.md §8.2) —
 * لا تُستخدم أبدًا كأساس فعلي للفوترة أو الاسترداد. */
export async function upsertExchangeRateAction(formData: FormData) {
  const admin = await requirePlatformAdmin();

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const baseCurrency = d.baseCurrency.toUpperCase();
  const targetCurrency = d.targetCurrency.toUpperCase();
  if (baseCurrency === targetCurrency) return { error: "لا يمكن أن تكون العملتان متطابقتين" };

  await prisma.exchangeRateNote.upsert({
    where: { baseCurrency_targetCurrency: { baseCurrency, targetCurrency } },
    update: { rate: d.rate },
    create: { baseCurrency, targetCurrency, rate: d.rate },
  });

  await logAdminAction({
    adminId: admin.id,
    action: "exchangeRate.upsert",
    targetType: "exchangeRate",
    details: { baseCurrency, targetCurrency, rate: d.rate },
  });

  revalidatePath("/admin/system-settings");
  return { success: true };
}

export async function deleteExchangeRateAction(id: number) {
  const admin = await requirePlatformAdmin();
  await prisma.exchangeRateNote.delete({ where: { id } });
  await logAdminAction({ adminId: admin.id, action: "exchangeRate.delete", targetType: "exchangeRate", targetId: id });
  revalidatePath("/admin/system-settings");
  return { success: true };
}
