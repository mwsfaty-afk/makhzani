"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/permissions";
import { toUserErrorMessage } from "@/lib/errors";
import { createSaleReturn } from "@/lib/services/sales/createSaleReturn";

export async function createSaleReturnAction(saleId: number, formData: FormData) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "sale_returns.create");
  if (denied) return denied;
  const { companyId, userId } = ctx;

  const lines = JSON.parse(String(formData.get("linesJson") ?? "[]")) as { saleItemId: number; qty: number }[];
  const reason = String(formData.get("reason") ?? "") || undefined;
  const refundMethod = String(formData.get("refundMethod") ?? "customer_credit") as "cash" | "customer_credit";

  try {
    await createSaleReturn({ companyId, userId, saleId, reason, refundMethod, lines });
  } catch (err) {
    return { error: toUserErrorMessage(err, "حدث خطأ أثناء حفظ المرتجع") };
  }

  revalidatePath(`/dashboard/sales/${saleId}`);
  revalidatePath("/dashboard/inventory/stock");
  redirect(`/dashboard/sales/${saleId}`);
}
