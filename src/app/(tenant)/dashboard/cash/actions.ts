"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/session";
import { recordCashTransaction } from "@/lib/services/cash/recordCashTransaction";
import { transferBetweenCashBoxes } from "@/lib/services/cash/transferBetweenCashBoxes";

const cashBoxSchema = z.object({
  name: z.string().min(1, "اسم الخزينة مطلوب"),
  type: z.enum(["cash", "bank"]),
});

export async function createCashBox(formData: FormData) {
  const { db } = await requireTenant();
  const parsed = cashBoxSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.cashBox.create({ data: parsed.data as any });
  revalidatePath("/dashboard/cash");
  return { success: true };
}

export async function recordCashTransactionAction(cashBoxId: number, formData: FormData) {
  const { companyId, userId } = await requireTenant();
  const type = String(formData.get("type") ?? "RECEIPT") as "RECEIPT" | "PAYMENT";
  const amount = Number(formData.get("amount"));
  const notes = String(formData.get("notes") ?? "") || undefined;

  try {
    await recordCashTransaction({ companyId, userId, cashBoxId, type, amount, notes });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "حدث خطأ أثناء تسجيل الحركة" };
  }
  revalidatePath(`/dashboard/cash/${cashBoxId}`);
  revalidatePath("/dashboard/cash");
  return { success: true };
}

export async function transferCashAction(fromCashBoxId: number, formData: FormData) {
  const { companyId, userId } = await requireTenant();
  const toCashBoxId = Number(formData.get("toCashBoxId"));
  const amount = Number(formData.get("amount"));
  const notes = String(formData.get("notes") ?? "") || undefined;

  try {
    await transferBetweenCashBoxes({ companyId, userId, fromCashBoxId, toCashBoxId, amount, notes });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "حدث خطأ أثناء التحويل" };
  }
  revalidatePath(`/dashboard/cash/${fromCashBoxId}`);
  revalidatePath(`/dashboard/cash/${toCashBoxId}`);
  revalidatePath("/dashboard/cash");
  return { success: true };
}
