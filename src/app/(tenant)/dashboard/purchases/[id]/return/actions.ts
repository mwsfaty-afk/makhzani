"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/auth/session";
import { createPurchaseReturn } from "@/lib/services/purchases/createPurchaseReturn";

export async function createPurchaseReturnAction(purchaseId: number, formData: FormData) {
  const { companyId, userId } = await requireTenant();

  const lines = JSON.parse(String(formData.get("linesJson") ?? "[]")) as { purchaseItemId: number; qty: number }[];
  const reason = String(formData.get("reason") ?? "") || undefined;

  try {
    await createPurchaseReturn({ companyId, userId, purchaseId, reason, lines });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "حدث خطأ أثناء حفظ المرتجع" };
  }

  revalidatePath(`/dashboard/purchases/${purchaseId}`);
  revalidatePath("/dashboard/inventory/stock");
  redirect(`/dashboard/purchases/${purchaseId}`);
}
