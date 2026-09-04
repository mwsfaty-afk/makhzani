"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/adminSession";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/services/admin/auditLog";
import { toUserErrorMessage } from "@/lib/errors";

const createSchema = z.object({
  code: z
    .string()
    .min(3, "الكود قصير جدًا")
    .transform((v) => v.trim().toUpperCase()),
  planId: z.coerce.number().int(),
  durationDays: z.coerce.number().int().min(1),
  maxRedemptions: z.coerce.number().int().min(1),
  expiresAt: z.string().optional(),
});

export async function createPromoCodeAction(formData: FormData) {
  const admin = await requirePlatformAdmin();

  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  const d = parsed.data;

  let promoId: number;
  try {
    const promo = await prisma.promoCode.create({
      data: {
        code: d.code,
        planId: d.planId,
        durationDays: d.durationDays,
        maxRedemptions: d.maxRedemptions,
        expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
      },
    });
    promoId = promo.id;
  } catch (err) {
    return { error: toUserErrorMessage(err, "تعذّر إنشاء الكود — تأكد أنه غير مستخدم من قبل") };
  }

  await logAdminAction({ adminId: admin.id, action: "promoCode.create", targetType: "promoCode", targetId: promoId, details: d });

  revalidatePath("/omar/promo-codes");
  redirect(`/omar/promo-codes/${promoId}`);
}

const updateSchema = z.object({
  maxRedemptions: z.coerce.number().int().min(1),
  expiresAt: z.string().optional(),
  isActive: z.enum(["on"]).optional(),
});

export async function updatePromoCodeAction(
  promoId: number,
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  const admin = await requirePlatformAdmin();

  const parsed = updateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  const d = parsed.data;

  await logAdminAction({ adminId: admin.id, action: "promoCode.update", targetType: "promoCode", targetId: promoId, details: d });

  await prisma.promoCode.update({
    where: { id: promoId },
    data: {
      maxRedemptions: d.maxRedemptions,
      expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
      isActive: d.isActive === "on",
    },
  });

  revalidatePath(`/omar/promo-codes/${promoId}`);
  revalidatePath("/omar/promo-codes");
  return { success: true };
}
