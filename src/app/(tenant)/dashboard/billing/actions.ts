"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/permissions";
import { toUserErrorMessage } from "@/lib/errors";
import { startCheckout } from "@/lib/services/billing/startCheckout";
import { attachManualPaymentProof, InvalidProofFileError } from "@/lib/services/billing/submitManualProof";
import { redeemPromoCode } from "@/lib/services/billing/redeemPromoCode";

function baseUrl() {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

export async function startCheckoutAction(planId: number, gatewayCode: string) {
  const ctx = await requireTenant();
  // إدارة الاشتراك/الفوترة تبقى محصورة على Owner/Admin (وحدهما يملكان صلاحيات settings.* في
  // الأدوار الافتراضية) — لا يستطيع دور Cashier أو Viewer مثلًا تغيير خطة الشركة أو دفع فاتورة.
  const denied = await checkPermission(ctx, "settings.edit");
  if (denied) return denied;
  const { companyId } = ctx;

  const isPaypal = gatewayCode === "paypal";
  const isPaytabs = gatewayCode === "paytabs";
  const returnUrl = isPaypal
    ? `${baseUrl()}/api/billing/paypal/return`
    : isPaytabs
      ? `${baseUrl()}/api/billing/paytabs/return`
      : `${baseUrl()}/dashboard/billing`;
  const cancelUrl = isPaypal ? `${baseUrl()}/api/billing/paypal/cancel` : `${baseUrl()}/dashboard/billing`;

  let outcome: Awaited<ReturnType<typeof startCheckout>>;
  try {
    outcome = await startCheckout({ companyId, planId, gatewayCode, returnUrl, cancelUrl });
  } catch (err) {
    return { error: toUserErrorMessage(err, "تعذّر بدء عملية الدفع") };
  }

  if (outcome.result.kind === "redirect") {
    redirect(outcome.result.redirectUrl);
  }

  // بوابة يدوية — انتقل لصفحة إدخال رقم المرجع ورفع الإثبات لنفس الدفعة المُنشأة للتو
  redirect(`/dashboard/billing/pay/${outcome.paymentId}`);
}

export async function submitManualProofAction(paymentId: number, formData: FormData) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "settings.edit");
  if (denied) return denied;
  const { companyId } = ctx;

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
    return { error: toUserErrorMessage(err, "تعذّر حفظ إثبات الدفع") };
  }

  redirect("/dashboard/billing?submitted=1");
}

export async function redeemPromoCodeAction(formData: FormData) {
  const ctx = await requireTenant();
  const denied = await checkPermission(ctx, "settings.edit");
  if (denied) return denied;

  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "أدخل الكود الترويجي" };

  try {
    const { planNameAr } = await redeemPromoCode(ctx.companyId, code);
    revalidatePath("/dashboard/billing");
    return { success: true, planNameAr };
  } catch (err) {
    return { error: toUserErrorMessage(err, "تعذّر تفعيل الكود") };
  }
}
