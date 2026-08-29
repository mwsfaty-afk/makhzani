import { NextResponse } from "next/server";
import { verifyPaytabsSignature } from "@/lib/services/billing/gateways/paytabsGateway";
import { activateSubscriptionFromPayment } from "@/lib/services/billing/activateSubscription";

/**
 * إشعار الدفع الفوري (IPN) من PayTabs — server-to-server، لا يعتمد على عودة متصفح
 * العميل فعليًا، فهو المصدر الأساسي والأكثر موثوقية لتفعيل الاشتراك. يرد 200 دائمًا
 * (اتفاقية PayTabs: أي رد غير 200 يجعلها تُعيد إرسال الإشعار بلا داعٍ).
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("signature");

  if (!verifyPaytabsSignature(rawBody, signature)) {
    return NextResponse.json({ error: "توقيع غير صالح" }, { status: 401 });
  }

  let data: { cart_id?: string; tran_ref?: string; payment_result?: { response_status?: string } };
  try {
    data = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const paymentId = Number(data.cart_id);
  const isAuthorised = data.payment_result?.response_status === "A";

  if (paymentId && isAuthorised) {
    try {
      await activateSubscriptionFromPayment(paymentId, { gatewayRef: data.tran_ref });
    } catch {
      // فشل التفعيل (دفعة مُعالَجة بالفعل عبر مسار العودة مثلًا) — لا داعٍ لإفشال الرد،
      // الحالة الفعلية للاشتراك هي المرجع، وليس نجاح هذا الاستدعاء تحديدًا.
    }
  }

  return NextResponse.json({ received: true });
}
