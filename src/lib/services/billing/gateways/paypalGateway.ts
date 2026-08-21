import type { PaymentGateway, CheckoutContext, CheckoutResult } from "./types";

const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

export class PayPalNotConfiguredError extends Error {
  constructor() {
    super("بوابة PayPal غير مُهيأة بعد — يلزم ضبط PAYPAL_CLIENT_ID وPAYPAL_CLIENT_SECRET في إعدادات النشر.");
    this.name = "PayPalNotConfiguredError";
  }
}

function requireCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new PayPalNotConfiguredError();
  return { clientId, clientSecret };
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = requireCredentials();
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("تعذّر الاتصال ببوابة PayPal (فشل المصادقة)");
  const data = await res.json();
  return data.access_token as string;
}

/** يحوّل عملة الخطة إلى ما يقبله PayPal — PayPal لا يدعم بعض العملات المحلية مباشرة
 * (مثل الجنيه المصري)، فتُستخدم USD كبديل في هذه الحالات فقط لغرض الدفع عبر PayPal
 * تحديدًا؛ سجل الدفعة والاشتراك يبقيان بعملة الخطة الأصلية دائمًا للعرض والفوترة. */
const PAYPAL_UNSUPPORTED_CURRENCIES = new Set(["EGP"]);

export const paypalGateway: PaymentGateway = {
  code: "paypal",

  async createCheckout(ctx: CheckoutContext): Promise<CheckoutResult> {
    const accessToken = await getAccessToken();

    const currency = PAYPAL_UNSUPPORTED_CURRENCIES.has(ctx.payment.currency) ? "USD" : ctx.payment.currency;
    const amount = Number(ctx.payment.amount).toFixed(2);

    const returnUrl = `${ctx.returnUrl}${ctx.returnUrl.includes("?") ? "&" : "?"}paymentId=${ctx.payment.id}`;
    const cancelUrl = `${ctx.cancelUrl}${ctx.cancelUrl.includes("?") ? "&" : "?"}paymentId=${ctx.payment.id}`;

    const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: String(ctx.payment.id),
            description: `Makhzani — ${ctx.plan.nameAr} (${ctx.company.name})`,
            amount: { currency_code: currency, value: amount },
          },
        ],
        application_context: {
          brand_name: "Makhzani | مخزني",
          user_action: "PAY_NOW",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`فشل إنشاء عملية الدفع عبر PayPal: ${body.slice(0, 200)}`);
    }

    const order = await res.json();
    const approveLink = (order.links as Array<{ rel: string; href: string }>).find((l) => l.rel === "approve");
    if (!approveLink) throw new Error("لم يُرجع PayPal رابط اعتماد صالحًا");

    return { kind: "redirect", redirectUrl: approveLink.href, gatewayRef: order.id as string };
  },
};

/** يُستدعى من مسار العودة بعد موافقة العميل على الدفع داخل PayPal — يلتقط (Capture)
 * العملية فعليًا (بدون هذه الخطوة لا يُحصَّل أي مبلغ فعلي). */
export async function capturePaypalOrder(orderId: string): Promise<{ success: boolean; raw: unknown }> {
  const accessToken = await getAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  });
  const data = await res.json();
  const success = res.ok && data.status === "COMPLETED";
  return { success, raw: data };
}
