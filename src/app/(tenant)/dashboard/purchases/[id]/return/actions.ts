"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/permissions";
import { toUserErrorMessage } from "@/lib/errors";
import { createPurchaseReturn } from "@/lib/services/purchases/createPurchaseReturn";

export async function createPurchaseReturnAction(purchaseId: number, formData: FormData) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "purchase_returns.create");
  if (denied) return denied;
  const { companyId, userId } = ctx;

  const lines = JSON.parse(String(formData.get("linesJson") ?? "[]")) as { purchaseItemId: number; qty: number }[];
  const reason = String(formData.get("reason") ?? "") || undefined;

  try {
    await createPurchaseReturn({ companyId, userId, purchaseId, reason, lines });
  } catch (err) {
    return { error: toUserErrorMessage(err, "حدث خطأ أثناء حفظ المرتجع") };
  }

  revalidatePath(`/dashboard/purchases/${purchaseId}`);
  revalidatePath("/dashboard/inventory/stock");
  redirect(`/dashboard/purchases/${purchaseId}`);
}
