"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/permissions";

const schema = z.object({
  name: z.string().min(1, "الاسم مطلوب (بالإنجليزية)"),
  nameAr: z.string().min(1, "الاسم بالعربية مطلوب"),
});

export async function createUnit(formData: FormData) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "units.create");
  if (denied) return denied;
  const { db } = ctx;
  const parsed = schema.safeParse({
    name: formData.get("name"),
    nameAr: formData.get("nameAr"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    // companyId يُحقَن تلقائيًا داخل tenantPrisma() وقت التشغيل — Prisma's generated types
    // لا "ترى" هذا الحقن (هو حقن Runtime عبر Client Extension)، فنتجاوز الفحص هنا بأمان.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.unit.create({ data: parsed.data as any });
  } catch {
    return { error: "هذه الوحدة موجودة بالفعل" };
  }
  revalidatePath("/dashboard/inventory/units");
  return { success: true };
}

export async function deleteUnit(id: number) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "units.delete");
  if (denied) return denied;
  const { db } = ctx;
  try {
    await db.unit.delete({ where: { id } });
  } catch {
    return { error: "لا يمكن حذف هذه الوحدة — مستخدمة في صنف بالفعل" };
  }
  revalidatePath("/dashboard/inventory/units");
  return { success: true };
}
