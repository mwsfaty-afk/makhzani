import { NextResponse } from "next/server";
import { verifyPaytabsReturnSignature } from "@/lib/services/billing/gateways/paytabsGateway";
import { activateSubscriptionFromPayment } from "@/lib/services/billing/activateSubscription";

/**
 * إعادة توجيه متصفح العميل بعد محاولة الدفع على صفحة PayTabs المستضافة. تُستخدَم فقط
 * لتجربة المستخدم (إعادة توجيه فورية لصفحة الفوترة) — المصدر الأساسي للتفعيل الفعلي هو
 * الإشعار الفوري (callback/route.ts)؛ هذا المسار يحاول التفعيل أيضًا كمسار سريع احتياطي
 * فقط (آمن من التكرار بفضل الحماية الذرّية داخل activateSubscriptionFromPayment).
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const base = `${url.origin}/dashboard/billing`;

  const formData = await request.formData();
  const fields: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") fields[key] = value;
  }

  // cartId في جسم الرد هو نفسه معرّف الدفعة الداخلي (مضبوط عند الإنشاء في paytabsGateway.ts) —
  // مصدر أوثق من الاعتماد فقط على ?paymentId= المُلحَق يدويًا برابط return.
  const paymentId = Number(fields.cartId || url.searchParams.get("paymentId"));

  if (!paymentId || !verifyPaytabsReturnSignature(fields)) {
    return NextResponse.redirect(`${base}?paytabs=failed`);
  }

  if (fields.respStatus !== "A") {
    return NextResponse.redirect(`${base}?paytabs=failed`);
  }

  try {
    await activateSubscriptionFromPayment(paymentId, { gatewayRef: fields.tranRef });
  } catch {
    // قد تكون فُعِّلت بالفعل عبر الـcallback — لا يعني هذا فشل الدفع نفسه
  }

  return NextResponse.redirect(`${base}?paytabs=success`);
}
