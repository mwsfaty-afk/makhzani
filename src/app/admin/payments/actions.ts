"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/adminSession";
import { destroyAdminSession } from "@/lib/auth/adminSession";
import { activateSubscriptionFromPayment, rejectManualPayment } from "@/lib/services/billing/activateSubscription";

export async function approvePaymentAction(paymentId: number) {
  const admin = await requirePlatformAdmin();
  try {
    await activateSubscriptionFromPayment(paymentId, { reviewedByAdminId: admin.id });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّرت الموافقة على الدفعة" };
  }
  revalidatePath("/admin/payments");
  return { success: true };
}

export async function rejectPaymentAction(paymentId: number, formData: FormData) {
  const admin = await requirePlatformAdmin();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "يرجى كتابة سبب الرفض" };

  try {
    await rejectManualPayment(paymentId, admin.id, reason);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّر رفض الدفعة" };
  }
  revalidatePath("/admin/payments");
  return { success: true };
}

export async function adminLogoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}
