"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/session";

const schema = z.object({
  name: z.string().min(1, "اسم المجموعة مطلوب"),
  parentId: z.string().optional(),
});

export async function createCategory(formData: FormData) {
  const { db } = await requireTenant();
  const parsed = schema.safeParse({
    name: formData.get("name"),
    parentId: formData.get("parentId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // companyId يُحقَن تلقائيًا داخل tenantPrisma() وقت التشغيل
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.category.create({
    data: {
      name: parsed.data.name,
      parentId: parsed.data.parentId && parsed.data.parentId !== "none" ? Number(parsed.data.parentId) : null,
    } as any,
  });
  revalidatePath("/dashboard/inventory/categories");
  return { success: true };
}

export async function deleteCategory(id: number) {
  const { db } = await requireTenant();
  try {
    await db.category.delete({ where: { id } });
  } catch {
    return { error: "لا يمكن حذف مجموعة تحتوي على أصناف أو مجموعات فرعية" };
  }
  revalidatePath("/dashboard/inventory/categories");
  return { success: true };
}
