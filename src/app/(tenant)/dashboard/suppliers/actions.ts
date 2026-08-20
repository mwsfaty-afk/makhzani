"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/session";

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
  const { db } = await requireTenant();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.supplier.create({ data: parsed.data as any });
  } catch {
    return { error: "كود المورد مستخدم بالفعل" };
  }
  revalidatePath("/dashboard/suppliers");
  return { success: true };
}

export async function deleteSupplier(id: number) {
  const { db } = await requireTenant();
  try {
    await db.supplier.delete({ where: { id } });
  } catch {
    return { error: "لا يمكن حذف مورد له فواتير مرتبطة به" };
  }
  revalidatePath("/dashboard/suppliers");
  return { success: true };
}
