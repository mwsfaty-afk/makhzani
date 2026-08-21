"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/permissions";
import { toUserErrorMessage } from "@/lib/errors";
import { collectFromCustomer } from "@/lib/services/customers/collectFromCustomer";
import { SubscriptionExpiredError } from "@/lib/services/billing/subscriptionGuard";
import { PlanLimitExceededError } from "@/lib/services/billing/enforceLimit";

const schema = z.object({
  code: z.string().min(1, "كود العميل مطلوب"),
  name: z.string().min(1, "اسم العميل مطلوب"),
  phone: z.string().optional(),
  email: z.string().optional(),
  taxNumber: z.string().optional(),
  creditLimit: z.coerce.number().min(0).optional(),
  openingBalance: z.coerce.number().optional(),
});

export async function createCustomer(formData: FormData) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "customers.create");
  if (denied) return denied;
  const { db } = ctx;
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.customer.create({ data: parsed.data as any });
  } catch (err) {
    if (err instanceof SubscriptionExpiredError || err instanceof PlanLimitExceededError) return { error: err.message };
    return { error: "كود العميل مستخدم بالفعل" };
  }
  revalidatePath("/dashboard/customers");
  return { success: true };
}

export async function collectFromCustomerAction(customerId: number, formData: FormData) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "customers.edit");
  if (denied) return denied;
  const { companyId, userId } = ctx;
  const amount = Number(formData.get("amount"));
  const notes = String(formData.get("notes") ?? "") || undefined;

  try {
    await collectFromCustomer({ companyId, userId, customerId, amount, notes });
  } catch (err) {
    return { error: toUserErrorMessage(err, "حدث خطأ أثناء التحصيل") };
  }
  revalidatePath(`/dashboard/customers/${customerId}`);
  return { success: true };
}

export async function deleteCustomer(id: number) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "customers.delete");
  if (denied) return denied;
  const { db } = ctx;
  try {
    await db.customer.delete({ where: { id } });
  } catch {
    return { error: "لا يمكن حذف عميل له فواتير مرتبطة به" };
  }
  revalidatePath("/dashboard/customers");
  return { success: true };
}
