"use server";

import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/auth/session";
import { startCheckout } from "@/lib/services/billing/startCheckout";
import { attachManualPaymentProof, InvalidProofFileError } from "@/lib/services/billing/submitManualProof";

function baseUrl() {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

export async function startCheckoutAction(planId: number, gatewayCode: string) {
  const { companyId } = await requireTenant();

  const isPaypal = gatewayCode === "paypal";
  const returnUrl = isPaypal ? `${baseUrl()}/api/billing/paypal/return` : `${baseUrl()}/dashboard/billing`;
  const cancelUrl = isPaypal ? `${baseUrl()}/api/billing/paypal/cancel` : `${baseUrl()}/dashboard/billing`;

  let outcome: Awaited<ReturnType<typeof startCheckout>>;
  try {
    outcome = await startCheckout({ companyId, planId, gatewayCode, returnUrl, cancelUrl });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "تعذّر بدء عملية الدفع" };
  }

  if (outcome.result.kind === "redirect") {
    redirect(outcome.result.redirectUrl);
  }

  // بوابة يدوية — انتقل لصفحة إدخال رقم المرجع ورفع الإثبات لنفس الدفعة المُنشأة للتو
  redirect(`/dashboard/billing/pay/${outcome.paymentId}`);
}

export async function submitManualProofAction(paymentId: number, formData: FormData) {
  const { companyId } = await requireTenant();

  const referenceNumber = String(formData.get("referenceNumber") ?? "");
  const file = formData.get("proof") as File | null;
  if (!file || file.size === 0) return { error: "يرجى اختيار ملف إثبات الدفع" };

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  try {
    await attachManualPaymentProof({
      paymentId,
      companyId,
      referenceNumber,
      fileBuffer,
      fileMimeType: file.type,
      fileName: file.name,
    });
  } catch (err) {
    if (err instanceof InvalidProofFileError) return { error: err.message };
    return { error: err instanceof Error ? err.message : "تعذّر حفظ إثبات الدفع" };
  }

  redirect("/dashboard/billing?submitted=1");
}
