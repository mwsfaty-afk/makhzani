"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/session";
import { SubscriptionExpiredError } from "@/lib/services/billing/subscriptionGuard";
import { PlanLimitExceededError } from "@/lib/services/billing/enforceLimit";

const optionalNumber = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? Number(v) : undefined));

const schema = z.object({
  code: z.string().min(1, "كود الصنف مطلوب"),
  barcode: z.string().optional(),
  name: z.string().min(1, "اسم الصنف بالإنجليزية مطلوب"),
  nameAr: z.string().min(1, "اسم الصنف بالعربية مطلوب"),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  baseUnitId: z.string().min(1, "الوحدة الأساسية مطلوبة"),
  purchaseUnitId: z.string().optional(),
  purchaseUnitFactor: optionalNumber,
  salesUnitId: z.string().optional(),
  salesUnitFactor: optionalNumber,
  purchasePrice: optionalNumber,
  salePrice: optionalNumber,
  taxRate: optionalNumber,
  minStock: optionalNumber,
  maxStock: optionalNumber,
  reorderPoint: optionalNumber,
});

export async function createItem(formData: FormData) {
  const { db } = await requireTenant();

  const raw = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const d = parsed.data;

  try {
    // companyId يُحقَن تلقائيًا داخل tenantPrisma() وقت التشغيل
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.item.create({
      data: {
        code: d.code,
        barcode: d.barcode || undefined,
        name: d.name,
        nameAr: d.nameAr,
        categoryId: d.categoryId ? Number(d.categoryId) : undefined,
        brandId: d.brandId ? Number(d.brandId) : undefined,
        baseUnitId: Number(d.baseUnitId),
        purchaseUnitId: d.purchaseUnitId ? Number(d.purchaseUnitId) : undefined,
        purchaseUnitFactor: d.purchaseUnitFactor ?? 1,
        salesUnitId: d.salesUnitId ? Number(d.salesUnitId) : undefined,
        salesUnitFactor: d.salesUnitFactor ?? 1,
        purchasePrice: d.purchasePrice ?? 0,
        salePrice: d.salePrice ?? 0,
        taxRate: d.taxRate ?? 0,
        minStock: d.minStock ?? 0,
        maxStock: d.maxStock ?? 0,
        reorderPoint: d.reorderPoint ?? 0,
      } as any,
    });
  } catch (err) {
    if (err instanceof SubscriptionExpiredError || err instanceof PlanLimitExceededError) return { error: err.message };
    return { error: "كود الصنف مستخدم بالفعل" };
  }

  revalidatePath("/dashboard/inventory/items");
  redirect("/dashboard/inventory/items");
}

export async function deleteItem(id: number) {
  const { db } = await requireTenant();
  try {
    await db.item.delete({ where: { id } });
  } catch {
    return { error: "لا يمكن حذف هذا الصنف — له حركات مخزون مرتبطة به" };
  }
  revalidatePath("/dashboard/inventory/items");
  return { success: true };
}
