"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/permissions";

const schema = z.object({ name: z.string().min(1, "اسم العلامة التجارية مطلوب") });

export async function createBrand(formData: FormData) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "brands.create");
  if (denied) return denied;
  const { db } = ctx;
  const parsed = schema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // companyId يُحقَن تلقائيًا داخل tenantPrisma() وقت التشغيل
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.brand.create({ data: parsed.data as any });
  revalidatePath("/dashboard/inventory/brands");
  return { success: true };
}

export async function deleteBrand(id: number) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "brands.delete");
  if (denied) return denied;
  const { db } = ctx;
  try {
    await db.brand.delete({ where: { id } });
  } catch {
    return { error: "لا يمكن حذف هذه العلامة — مستخدمة في صنف بالفعل" };
  }
  revalidatePath("/dashboard/inventory/brands");
  return { success: true };
}
