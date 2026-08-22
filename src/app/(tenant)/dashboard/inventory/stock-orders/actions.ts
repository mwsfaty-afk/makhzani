"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/permissions";
import { toUserErrorMessage } from "@/lib/errors";
import { createStockOrder, type CreateStockOrderLine } from "@/lib/services/inventory/createStockOrder";
import { postStockOrder } from "@/lib/services/inventory/postStockOrder";
import { deleteStockOrderDraft } from "@/lib/services/inventory/deleteStockOrderDraft";

const lineSchema = z.object({
  itemId: z.number().int().positive(),
  qty: z.number().positive(),
  unitCost: z.number().min(0).optional(),
  expiryDate: z.string().optional(),
});

const schema = z.object({
  warehouseId: z.coerce.number().int().positive("اختر المخزن"),
  direction: z.enum(["IN", "OUT"]),
  reason: z.string().min(1, "اختر السبب"),
  date: z.string().min(1),
  notes: z.string().optional(),
  linesJson: z.string(),
});

export async function createStockOrderAction(formData: FormData) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "stock_orders.create");
  if (denied) return denied;
  const { companyId, userId } = ctx;

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let rawLines: z.infer<typeof lineSchema>[];
  try {
    rawLines = z.array(lineSchema).min(1, "أضف صنفًا واحدًا على الأقل").parse(JSON.parse(parsed.data.linesJson));
  } catch {
    return { error: "بيانات أصناف الأمر غير صحيحة" };
  }

  const lines: CreateStockOrderLine[] = rawLines.map((l) => ({
    itemId: l.itemId,
    qty: l.qty,
    unitCost: l.unitCost,
    expiryDate: l.expiryDate ? new Date(l.expiryDate) : undefined,
  }));

  let orderId: number;
  try {
    const order = await createStockOrder({
      companyId,
      userId,
      warehouseId: parsed.data.warehouseId,
      direction: parsed.data.direction,
      reason: parsed.data.reason,
      date: new Date(parsed.data.date),
      notes: parsed.data.notes,
      lines,
    });
    orderId = order.id;
  } catch (err) {
    return { error: toUserErrorMessage(err, "حدث خطأ أثناء حفظ الأمر") };
  }

  revalidatePath("/dashboard/inventory/stock-orders");
  redirect(`/dashboard/inventory/stock-orders/${orderId}`);
}

export async function postStockOrderAction(orderId: number): Promise<{ error?: string; success?: boolean }> {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "stock_orders.approve");
  if (denied) return denied;
  const { companyId, userId } = ctx;
  try {
    await postStockOrder(companyId, orderId, userId);
  } catch (err) {
    return { error: toUserErrorMessage(err, "حدث خطأ أثناء اعتماد الأمر") };
  }
  revalidatePath(`/dashboard/inventory/stock-orders/${orderId}`);
  revalidatePath("/dashboard/inventory/stock-orders");
  revalidatePath("/dashboard/inventory/stock");
  revalidatePath("/dashboard/inventory");
  return { success: true };
}

export async function deleteStockOrderDraftAction(orderId: number): Promise<{ error?: string; success?: boolean }> {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "stock_orders.create");
  if (denied) return denied;
  const { companyId } = ctx;
  try {
    await deleteStockOrderDraft(companyId, orderId);
  } catch (err) {
    return { error: toUserErrorMessage(err, "حدث خطأ أثناء حذف المسودة") };
  }
  revalidatePath("/dashboard/inventory/stock-orders");
  redirect("/dashboard/inventory/stock-orders");
}
