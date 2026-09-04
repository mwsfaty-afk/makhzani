"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/permissions";
import { toUserErrorMessage } from "@/lib/errors";
import { collectFromCustomer } from "@/lib/services/customers/collectFromCustomer";
import { SubscriptionExpiredError } from "@/lib/services/billing/subscriptionGuard";
import { PlanLimitExceededError } from "@/lib/services/billing/enforceLimit";
import { parseCsv } from "@/lib/csv";

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

type ImportRowError = { row: number; message: string };
type ImportResult = { created: number; errors: ImportRowError[]; stoppedEarly: boolean };

/** يستورد عملاء من ملف CSV — يتوقف فورًا عند تجاوز حد الخطة، ويواصل باقي الصفوف عند أي
 * خطأ آخر (كود مكرر، صف ناقص) مع تجميع الأخطاء لعرضها للمستخدم. */
export async function importCustomersAction(formData: FormData): Promise<{ error: string } | ImportResult> {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "customers.create");
  if (denied) return denied;
  const { db } = ctx;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "يرجى اختيار ملف CSV" };

  const text = await file.text();
  const rows = parseCsv(text).slice(1); // تجاهل صف العناوين
  if (rows.length === 0) return { error: "الملف لا يحتوي على بيانات" };

  const errors: ImportRowError[] = [];
  let created = 0;
  let stoppedEarly = false;

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
    const [code, name, phone, email, taxNumber, creditLimitRaw, openingBalanceRaw] = rows[i].map((c) => c.trim());

    if (!code) {
      errors.push({ row: rowNumber, message: "الكود مطلوب" });
      continue;
    }
    if (!name) {
      errors.push({ row: rowNumber, message: "الاسم مطلوب" });
      continue;
    }

    const creditLimit = creditLimitRaw && !Number.isNaN(Number(creditLimitRaw)) ? Number(creditLimitRaw) : 0;
    const openingBalance = openingBalanceRaw && !Number.isNaN(Number(openingBalanceRaw)) ? Number(openingBalanceRaw) : 0;

    try {
      await db.customer.create({
        data: {
          code,
          name,
          phone: phone || undefined,
          email: email || undefined,
          taxNumber: taxNumber || undefined,
          creditLimit,
          openingBalance,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });
      created++;
    } catch (err) {
      if (err instanceof SubscriptionExpiredError || err instanceof PlanLimitExceededError) {
        errors.push({ row: rowNumber, message: err.message });
        stoppedEarly = true;
        break;
      }
      errors.push({ row: rowNumber, message: `كود العميل "${code}" مستخدم بالفعل أو بيانات غير صالحة` });
    }
  }

  if (created > 0) revalidatePath("/dashboard/customers");
  return { created, errors, stoppedEarly };
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
