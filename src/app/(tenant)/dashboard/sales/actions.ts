"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/session";
import { createSale, type CreateSaleLine } from "@/lib/services/sales/createSale";
import { postSale } from "@/lib/services/sales/postSale";
import { cancelSale } from "@/lib/services/sales/cancelSale";

const lineSchema = z.object({
  itemId: z.number().int().positive(),
  unitId: z.number().int().positive(),
  qty: z.number().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).optional(),
  taxRate: z.number().min(0).optional(),
});

const schema = z.object({
  customerId: z.coerce.number().int().positive("اختر العميل"),
  warehouseId: z.coerce.number().int().positive("اختر المخزن"),
  date: z.string().min(1),
  paymentMethod: z.string().optional(),
  paidAmount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  linesJson: z.string(),
});

export async function createSaleAction(formData: FormData) {
  const { companyId, userId } = await requireTenant();

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let lines: CreateSaleLine[];
  try {
    lines = z.array(lineSchema).min(1, "أضف صنفًا واحدًا على الأقل").parse(JSON.parse(parsed.data.linesJson));
  } catch {
    return { error: "بيانات أصناف الفاتورة غير صحيحة" };
  }

  let saleId: number;
  try {
    const sale = await createSale({
      companyId,
      userId,
      customerId: parsed.data.customerId,
      warehouseId: parsed.data.warehouseId,
      date: new Date(parsed.data.date),
      paymentMethod: parsed.data.paymentMethod,
      paidAmount: parsed.data.paidAmount,
      notes: parsed.data.notes,
      lines,
    });
    saleId = sale.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "حدث خطأ أثناء حفظ الفاتورة" };
  }

  revalidatePath("/dashboard/sales");
  redirect(`/dashboard/sales/${saleId}`);
}

export async function postSaleAction(saleId: number) {
  const { companyId, userId } = await requireTenant();
  try {
    await postSale(companyId, saleId, userId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "حدث خطأ أثناء اعتماد الفاتورة" };
  }
  revalidatePath(`/dashboard/sales/${saleId}`);
  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard/inventory/stock");
  return { success: true };
}

export async function cancelSaleAction(saleId: number) {
  const { companyId, userId } = await requireTenant();
  try {
    await cancelSale(companyId, saleId, userId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "حدث خطأ أثناء إلغاء الفاتورة" };
  }
  revalidatePath(`/dashboard/sales/${saleId}`);
  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard/inventory/stock");
  return { success: true };
}
