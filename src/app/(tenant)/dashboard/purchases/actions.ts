"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/session";
import { createPurchase, type CreatePurchaseLine } from "@/lib/services/purchases/createPurchase";
import { postPurchase } from "@/lib/services/purchases/postPurchase";
import { cancelPurchase } from "@/lib/services/purchases/cancelPurchase";

const lineSchema = z.object({
  itemId: z.number().int().positive(),
  unitId: z.number().int().positive(),
  qty: z.number().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).optional(),
  taxRate: z.number().min(0).optional(),
});

const schema = z.object({
  supplierId: z.coerce.number().int().positive("اختر المورد"),
  warehouseId: z.coerce.number().int().positive("اختر المخزن"),
  date: z.string().min(1),
  paymentMethod: z.string().optional(),
  paidAmount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  linesJson: z.string(),
});

export async function createPurchaseAction(formData: FormData) {
  const { companyId, userId } = await requireTenant();

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let lines: CreatePurchaseLine[];
  try {
    lines = z.array(lineSchema).min(1, "أضف صنفًا واحدًا على الأقل").parse(JSON.parse(parsed.data.linesJson));
  } catch {
    return { error: "بيانات أصناف الفاتورة غير صحيحة" };
  }

  let purchaseId: number;
  try {
    const purchase = await createPurchase({
      companyId,
      userId,
      supplierId: parsed.data.supplierId,
      warehouseId: parsed.data.warehouseId,
      date: new Date(parsed.data.date),
      paymentMethod: parsed.data.paymentMethod,
      paidAmount: parsed.data.paidAmount,
      notes: parsed.data.notes,
      lines,
    });
    purchaseId = purchase.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "حدث خطأ أثناء حفظ الفاتورة" };
  }

  revalidatePath("/dashboard/purchases");
  redirect(`/dashboard/purchases/${purchaseId}`);
}

export async function postPurchaseAction(purchaseId: number) {
  const { companyId, userId } = await requireTenant();
  try {
    await postPurchase(companyId, purchaseId, userId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "حدث خطأ أثناء اعتماد الفاتورة" };
  }
  revalidatePath(`/dashboard/purchases/${purchaseId}`);
  revalidatePath("/dashboard/purchases");
  revalidatePath("/dashboard/inventory/stock");
  return { success: true };
}

export async function cancelPurchaseAction(purchaseId: number) {
  const { companyId, userId } = await requireTenant();
  try {
    await cancelPurchase(companyId, purchaseId, userId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "حدث خطأ أثناء إلغاء الفاتورة" };
  }
  revalidatePath(`/dashboard/purchases/${purchaseId}`);
  revalidatePath("/dashboard/purchases");
  revalidatePath("/dashboard/inventory/stock");
  return { success: true };
}
