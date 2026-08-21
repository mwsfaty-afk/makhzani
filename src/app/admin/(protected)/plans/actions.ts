"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/adminSession";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/services/admin/auditLog";

const planSchema = z.object({
  nameAr: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  currency: z.string().min(1),
  durationDays: z.coerce.number().int().min(0),
  maxUsers: z.coerce.number().int().min(1),
  maxBranches: z.coerce.number().int().min(1),
  maxWarehouses: z.coerce.number().int().min(1),
  maxItems: z.coerce.number().int().min(1),
  maxCustomers: z.coerce.number().int().min(1),
  maxSuppliers: z.coerce.number().int().min(1),
  maxMonthlyDocuments: z.coerce.number().int().min(1),
  maxStorageMb: z.coerce.number().int().min(1),
  isActive: z.enum(["on"]).optional(),
  isPublic: z.enum(["on"]).optional(),
});

export async function updatePlanAction(planId: number, formData: FormData) {
  const admin = await requirePlatformAdmin();

  const parsed = planSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  await logAdminAction({ adminId: admin.id, action: "plan.update", targetType: "plan", targetId: planId, details: d });

  await prisma.plan.update({
    where: { id: planId },
    data: {
      nameAr: d.nameAr,
      description: d.description || undefined,
      price: d.price,
      currency: d.currency,
      durationDays: d.durationDays,
      maxUsers: d.maxUsers,
      maxBranches: d.maxBranches,
      maxWarehouses: d.maxWarehouses,
      maxItems: d.maxItems,
      maxCustomers: d.maxCustomers,
      maxSuppliers: d.maxSuppliers,
      maxMonthlyDocuments: d.maxMonthlyDocuments,
      maxStorageMb: d.maxStorageMb,
      isActive: d.isActive === "on",
      isPublic: d.isPublic === "on",
    },
  });

  revalidatePath(`/admin/plans/${planId}`);
  revalidatePath("/admin/plans");
  return { success: true };
}

const planPriceSchema = z.object({
  countryCode: z.string().length(2),
  currency: z.string().min(1),
  price: z.coerce.number().min(0),
});

export async function upsertPlanPriceAction(planId: number, formData: FormData) {
  const admin = await requirePlatformAdmin();

  const parsed = planPriceSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  await prisma.planPrice.upsert({
    where: { planId_countryCode: { planId, countryCode: d.countryCode.toUpperCase() } },
    update: { currency: d.currency.toUpperCase(), price: d.price },
    create: { planId, countryCode: d.countryCode.toUpperCase(), currency: d.currency.toUpperCase(), price: d.price },
  });

  await logAdminAction({ adminId: admin.id, action: "planPrice.upsert", targetType: "plan", targetId: planId, details: d });

  revalidatePath(`/admin/plans/${planId}`);
  return { success: true };
}

export async function deletePlanPriceAction(planId: number, planPriceId: number) {
  const admin = await requirePlatformAdmin();
  // نتحقق أن السعر فعلًا تابع لهذه الخطة قبل الحذف — منع حذف عابر لخطة أخرى بمعرّف غير متطابق
  const price = await prisma.planPrice.findFirst({ where: { id: planPriceId, planId } });
  if (!price) return { error: "السعر غير موجود لهذه الخطة" };

  await prisma.planPrice.delete({ where: { id: planPriceId } });
  await logAdminAction({ adminId: admin.id, action: "planPrice.delete", targetType: "plan", targetId: planId, details: { planPriceId } });
  revalidatePath(`/admin/plans/${planId}`);
  return { success: true };
}
