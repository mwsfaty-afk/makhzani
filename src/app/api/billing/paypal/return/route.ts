import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { capturePaypalOrder } from "@/lib/services/billing/gateways";
import { activateSubscriptionFromPayment } from "@/lib/services/billing/activateSubscription";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentId = Number(url.searchParams.get("paymentId"));
  const orderId = url.searchParams.get("token"); // اسم PayPal الرسمي لمعرّف الطلب في رابط العودة

  const base = `${url.origin}/dashboard/billing`;
  if (!paymentId || !orderId) {
    return NextResponse.redirect(`${base}?paypal=failed`);
  }

  try {
    const { success } = await capturePaypalOrder(orderId);
    if (!success) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "FAILED", rejectionReason: "فشل التقاط عملية الدفع (Capture) من PayPal" },
      });
      return NextResponse.redirect(`${base}?paypal=failed`);
    }

    await activateSubscriptionFromPayment(paymentId, { gatewayRef: orderId });
    return NextResponse.redirect(`${base}?paypal=success`);
  } catch {
    return NextResponse.redirect(`${base}?paypal=failed`);
  }
}
