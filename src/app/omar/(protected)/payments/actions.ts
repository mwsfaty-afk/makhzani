"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/adminSession";
import { activateSubscriptionFromPayment, rejectManualPayment } from "@/lib/services/billing/activateSubscription";
import { logAdminAction } from "@/lib/services/admin/auditLog";
import { toUserErrorMessage } from "@/lib/errors";

export async function approvePaymentAction(paymentId: number) {
  const admin = await requirePlatformAdmin();
  try {
    await activateSubscriptionFromPayment(paymentId, { reviewedByAdminId: admin.id });
  } catch (err) {
    return { error: toUserErrorMessage(err, "تعذّرت الموافقة على الدفعة") };
  }
  await logAdminAction({ adminId: admin.id, action: "payment.approve", targetType: "payment", targetId: paymentId });
  revalidatePath("/omar/payments");
  return { success: true };
}

export async function rejectPaymentAction(paymentId: number, formData: FormData) {
  const admin = await requirePlatformAdmin();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "يرجى كتابة سبب الرفض" };

  try {
    await rejectManualPayment(paymentId, admin.id, reason);
  } catch (err) {
    return { error: toUserErrorMessage(err, "تعذّر رفض الدفعة") };
  }
  await logAdminAction({ adminId: admin.id, action: "payment.reject", targetType: "payment", targetId: paymentId, details: { reason } });
  revalidatePath("/omar/payments");
  return { success: true };
}
