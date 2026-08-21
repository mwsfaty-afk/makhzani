"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/permissions";
import { SubscriptionExpiredError } from "@/lib/services/billing/subscriptionGuard";
import { PlanLimitExceededError } from "@/lib/services/billing/enforceLimit";

const schema = z.object({
  code: z.string().min(1, "كود المخزن مطلوب"),
  name: z.string().min(1, "اسم المخزن مطلوب"),
  address: z.string().optional(),
  managerName: z.string().optional(),
  phone: z.string().optional(),
});

export async function createWarehouse(formData: FormData) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "warehouses.create");
  if (denied) return denied;
  const { db } = ctx;
  const parsed = schema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    address: formData.get("address") || undefined,
    managerName: formData.get("managerName") || undefined,
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    // companyId يُحقَن تلقائيًا داخل tenantPrisma() وقت التشغيل
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.warehouse.create({ data: parsed.data as any });
  } catch (err) {
    if (err instanceof SubscriptionExpiredError || err instanceof PlanLimitExceededError) return { error: err.message };
    return { error: "كود المخزن مستخدم بالفعل" };
  }
  revalidatePath("/dashboard/inventory/warehouses");
  return { success: true };
}

export async function deleteWarehouse(id: number) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "warehouses.delete");
  if (denied) return denied;
  const { db } = ctx;
  const warehouse = await db.warehouse.findUnique({ where: { id } });
  if (warehouse?.isDefault) {
    return { error: "لا يمكن حذف المخزن الافتراضي" };
  }
  try {
    await db.warehouse.delete({ where: { id } });
  } catch {
    return { error: "لا يمكن حذف هذا المخزن — لديه حركات مخزون مرتبطة به" };
  }
  revalidatePath("/dashboard/inventory/warehouses");
  return { success: true };
}
