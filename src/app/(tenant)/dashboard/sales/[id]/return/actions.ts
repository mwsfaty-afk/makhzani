"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/auth/session";
import { createSaleReturn } from "@/lib/services/sales/createSaleReturn";

export async function createSaleReturnAction(saleId: number, formData: FormData) {
  const { companyId, userId } = await requireTenant();

  const lines = JSON.parse(String(formData.get("linesJson") ?? "[]")) as { saleItemId: number; qty: number }[];
  const reason = String(formData.get("reason") ?? "") || undefined;
  const refundMethod = String(formData.get("refundMethod") ?? "customer_credit") as "cash" | "customer_credit";

  try {
    await createSaleReturn({ companyId, userId, saleId, reason, refundMethod, lines });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "حدث خطأ أثناء حفظ المرتجع" };
  }

  revalidatePath(`/dashboard/sales/${saleId}`);
  revalidatePath("/dashboard/inventory/stock");
  redirect(`/dashboard/sales/${saleId}`);
}
