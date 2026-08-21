"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/permissions";
import { toUserErrorMessage } from "@/lib/errors";
import { payToSupplier } from "@/lib/services/suppliers/payToSupplier";
import { SubscriptionExpiredError } from "@/lib/services/billing/subscriptionGuard";
import { PlanLimitExceededError } from "@/lib/services/billing/enforceLimit";

const schema = z.object({
  code: z.string().min(1, "كود المورد مطلوب"),
  name: z.string().min(1, "اسم المورد مطلوب"),
  phone: z.string().optional(),
  email: z.string().optional(),
  taxNumber: z.string().optional(),
  creditLimit: z.coerce.number().min(0).optional(),
  openingBalance: z.coerce.number().optional(),
});

export async function createSupplier(formData: FormData) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "suppliers.create");
  if (denied) return denied;
  const { db } = ctx;
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.supplier.create({ data: parsed.data as any });
  } catch (err) {
    if (err instanceof SubscriptionExpiredError || err instanceof PlanLimitExceededError) return { error: err.message };
    return { error: "كود المورد مستخدم بالفعل" };
  }
  revalidatePath("/dashboard/suppliers");
  return { success: true };
}

export async function payToSupplierAction(supplierId: number, formData: FormData) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "suppliers.edit");
  if (denied) return denied;
  const { companyId, userId } = ctx;
  const amount = Number(formData.get("amount"));
  const notes = String(formData.get("notes") ?? "") || undefined;

  try {
    await payToSupplier({ companyId, userId, supplierId, amount, notes });
  } catch (err) {
    return { error: toUserErrorMessage(err, "حدث خطأ أثناء السداد") };
  }
  revalidatePath(`/dashboard/suppliers/${supplierId}`);
  return { success: true };
}

export async function deleteSupplier(id: number) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "suppliers.delete");
  if (denied) return denied;
  const { db } = ctx;
  try {
    await db.supplier.delete({ where: { id } });
  } catch {
    return { error: "لا يمكن حذف مورد له فواتير مرتبطة به" };
  }
  revalidatePath("/dashboard/suppliers");
  return { success: true };
}
