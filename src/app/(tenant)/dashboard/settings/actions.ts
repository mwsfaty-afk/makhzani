"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { toUserErrorMessage } from "@/lib/errors";

export async function updateTaxSettingsAction(formData: FormData) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "settings.edit");
  if (denied) return denied;

  const taxEnabled = formData.get("taxEnabled") === "on";
  const defaultTaxRate = Number(formData.get("defaultTaxRate") ?? 0);
  if (!Number.isFinite(defaultTaxRate) || defaultTaxRate < 0 || defaultTaxRate > 100) {
    return { error: "نسبة الضريبة يجب أن تكون رقمًا بين 0 و100" };
  }

  try {
    await prisma.company.update({
      where: { id: ctx.companyId },
      data: { taxEnabled, defaultTaxRate },
    });
  } catch (err) {
    return { error: toUserErrorMessage(err, "تعذّر حفظ إعدادات الضريبة") };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateModuleSettingsAction(formData: FormData) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "settings.edit");
  if (denied) return denied;

  const salesEnabled = formData.get("salesEnabled") === "on";
  const purchasesEnabled = formData.get("purchasesEnabled") === "on";

  try {
    await prisma.company.update({
      where: { id: ctx.companyId },
      data: { salesEnabled, purchasesEnabled },
    });
  } catch (err) {
    return { error: toUserErrorMessage(err, "تعذّر حفظ إعدادات الوحدات") };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard", "layout");
  return { success: true };
}
