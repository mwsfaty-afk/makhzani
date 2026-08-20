"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/session";

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
  const { db } = await requireTenant();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.customer.create({ data: parsed.data as any });
  } catch {
    return { error: "كود العميل مستخدم بالفعل" };
  }
  revalidatePath("/dashboard/customers");
  return { success: true };
}

export async function deleteCustomer(id: number) {
  const { db } = await requireTenant();
  try {
    await db.customer.delete({ where: { id } });
  } catch {
    return { error: "لا يمكن حذف عميل له فواتير مرتبطة به" };
  }
  revalidatePath("/dashboard/customers");
  return { success: true };
}
