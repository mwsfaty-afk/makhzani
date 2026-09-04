"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/permissions";
import { SubscriptionExpiredError } from "@/lib/services/billing/subscriptionGuard";
import { PlanLimitExceededError } from "@/lib/services/billing/enforceLimit";
import { parseCsv } from "@/lib/csv";

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
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "items.create");
  if (denied) return denied;
  const { db } = ctx;

  const raw = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const d = parsed.data;

  try {
    // companyId يُحقَن تلقائيًا داخل tenantPrisma() وقت التشغيل
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
  } catch (err) {
    if (err instanceof SubscriptionExpiredError || err instanceof PlanLimitExceededError) return { error: err.message };
    return { error: "كود الصنف مستخدم بالفعل" };
  }

  revalidatePath("/dashboard/inventory/items");
  redirect("/dashboard/inventory/items");
}

type ImportRowError = { row: number; message: string };
type ImportResult = { created: number; errors: ImportRowError[]; stoppedEarly: boolean };

/** يستورد أصنافًا من ملف CSV — يبحث عن الوحدة/المجموعة/العلامة التجارية بالاسم ضمن
 * الشركة، وينشئها تلقائيًا إن لم تكن موجودة (تقليل حاجز الإدخال لعميل عنده بيانات جاهزة
 * في إكسل). يتوقف فورًا عند تجاوز حد الخطة (PlanLimitExceededError)، لكن يواصل باقي
 * الصفوف عند أي خطأ آخر (كود مكرر، صف ناقص) ويجمع الأخطاء لعرضها للمستخدم. */
export async function importItemsAction(formData: FormData): Promise<{ error: string } | ImportResult> {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "items.create");
  if (denied) return denied;
  const { db } = ctx;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "يرجى اختيار ملف CSV" };

  const text = await file.text();
  const rows = parseCsv(text).slice(1); // تجاهل صف العناوين
  if (rows.length === 0) return { error: "الملف لا يحتوي على بيانات" };

  const unitCache = new Map<string, number>();
  const categoryCache = new Map<string, number>();
  const brandCache = new Map<string, number>();

  async function resolveUnit(nameAr: string): Promise<number> {
    const key = nameAr.trim().toLowerCase();
    const cached = unitCache.get(key);
    if (cached) return cached;
    const existing = await db.unit.findFirst({ where: { nameAr: { equals: nameAr.trim(), mode: "insensitive" } } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- companyId يُحقَن تلقائيًا داخل tenantPrisma()، انظر createItem أعلاه
    const id = existing ? existing.id : (await db.unit.create({ data: { name: nameAr.trim(), nameAr: nameAr.trim() } as any })).id;
    unitCache.set(key, id);
    return id;
  }

  async function resolveCategory(name: string): Promise<number> {
    const key = name.trim().toLowerCase();
    const cached = categoryCache.get(key);
    if (cached) return cached;
    const existing = await db.category.findFirst({ where: { name: { equals: name.trim(), mode: "insensitive" } } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- companyId يُحقَن تلقائيًا داخل tenantPrisma()، انظر createItem أعلاه
    const id = existing ? existing.id : (await db.category.create({ data: { name: name.trim() } as any })).id;
    categoryCache.set(key, id);
    return id;
  }

  async function resolveBrand(name: string): Promise<number> {
    const key = name.trim().toLowerCase();
    const cached = brandCache.get(key);
    if (cached) return cached;
    const existing = await db.brand.findFirst({ where: { name: { equals: name.trim(), mode: "insensitive" } } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- companyId يُحقَن تلقائيًا داخل tenantPrisma()، انظر createItem أعلاه
    const id = existing ? existing.id : (await db.brand.create({ data: { name: name.trim() } as any })).id;
    brandCache.set(key, id);
    return id;
  }

  const errors: ImportRowError[] = [];
  let created = 0;
  let stoppedEarly = false;

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // +1 للفهرسة من 1 و+1 لصف العناوين
    const [code, nameAr, name, unitName, categoryName, brandName, purchasePriceRaw, salePriceRaw] = rows[i].map((c) => c.trim());

    if (!code) {
      errors.push({ row: rowNumber, message: "الكود مطلوب" });
      continue;
    }
    if (!nameAr && !name) {
      errors.push({ row: rowNumber, message: "اسم الصنف مطلوب" });
      continue;
    }
    if (!unitName) {
      errors.push({ row: rowNumber, message: "الوحدة مطلوبة" });
      continue;
    }

    try {
      const baseUnitId = await resolveUnit(unitName);
      const categoryId = categoryName ? await resolveCategory(categoryName) : undefined;
      const brandId = brandName ? await resolveBrand(brandName) : undefined;
      const purchasePrice = purchasePriceRaw && !Number.isNaN(Number(purchasePriceRaw)) ? Number(purchasePriceRaw) : 0;
      const salePrice = salePriceRaw && !Number.isNaN(Number(salePriceRaw)) ? Number(salePriceRaw) : 0;

      await db.item.create({
        data: {
          code,
          name: name || nameAr,
          nameAr: nameAr || name,
          baseUnitId,
          categoryId,
          brandId,
          purchasePrice,
          salePrice,
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
      errors.push({ row: rowNumber, message: `كود الصنف "${code}" مستخدم بالفعل أو بيانات غير صالحة` });
    }
  }

  if (created > 0) revalidatePath("/dashboard/inventory/items");
  return { created, errors, stoppedEarly };
}

export async function deleteItem(id: number) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "items.delete");
  if (denied) return denied;
  const { db } = ctx;
  try {
    await db.item.delete({ where: { id } });
  } catch {
    return { error: "لا يمكن حذف هذا الصنف — له حركات مخزون مرتبطة به" };
  }
  revalidatePath("/dashboard/inventory/items");
  return { success: true };
}
