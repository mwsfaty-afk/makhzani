import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentGateway, CheckoutContext, CheckoutResult } from "./types";

export class PayTabsNotConfiguredError extends Error {
  constructor() {
    super("بوابة PayTabs غير مُهيأة بعد — يلزم ضبط PAYTABS_SERVER_KEY وPAYTABS_PROFILE_ID وPAYTABS_BASE_URL في إعدادات النشر.");
    this.name = "PayTabsNotConfiguredError";
  }
}

function requireCredentials() {
  const serverKey = process.env.PAYTABS_SERVER_KEY;
  const profileId = process.env.PAYTABS_PROFILE_ID;
  const paytabsBaseUrl = process.env.PAYTABS_BASE_URL;
  if (!serverKey || !profileId || !paytabsBaseUrl) throw new PayTabsNotConfiguredError();
  return { serverKey, profileId, paytabsBaseUrl };
}

function appBaseUrl() {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

/**
 * حساب PayTabs الحالي (منطقة مصر) لا يقبل إلا الجنيه المصري — أي عملة أخرى (SAR...) تُرفَض
 * من PayTabs نفسها بخطأ "Currency not available". قرار المستخدم الصريح: العميل غير المصري
 * يدفع بنفس *الرقم* المعروض له بعملته (مثلًا 50) لكن بعملة جنيه مصري حرفيًا (50 EGP وليس
 * ما يعادل 50 SAR فعليًا) — وليس تحويلًا فعليًا للقيمة. سجل الدفعة في قاعدة البيانات
 * (`Payment.amount`/`currency`) يبقى بعملة الشركة الأصلية دون تغيير؛ هذا الاستبدال يخص فقط
 * الطلب المُرسَل لـPayTabs.
 */
function paytabsCurrency(currency: string): string {
  return currency === "EGP" ? currency : "EGP";
}

export const paytabsGateway: PaymentGateway = {
  code: "paytabs",

  async createCheckout(ctx: CheckoutContext): Promise<CheckoutResult> {
    const { serverKey, profileId, paytabsBaseUrl } = requireCredentials();

    const returnUrl = `${ctx.returnUrl}${ctx.returnUrl.includes("?") ? "&" : "?"}paymentId=${ctx.payment.id}`;
    const callbackUrl = `${appBaseUrl()}/api/billing/paytabs/callback`;

    const res = await fetch(`${paytabsBaseUrl}/payment/request`, {
      method: "POST",
      headers: { Authorization: serverKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: Number(profileId),
        tran_type: "sale",
        tran_class: "ecom",
        cart_id: String(ctx.payment.id),
        cart_description: `Makhzani — ${ctx.plan.nameAr} (${ctx.company.name})`,
        cart_currency: paytabsCurrency(ctx.payment.currency),
        cart_amount: Number(ctx.payment.amount),
        callback: callbackUrl,
        return: returnUrl,
        hide_shipping: true,
        customer_details: {
          name: ctx.company.ownerName,
          email: ctx.company.email,
          phone: ctx.company.phone || undefined,
          street1: ctx.company.name,
          city: "NA",
          state: "NA",
          country: ctx.company.country,
          zip: "00000",
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`فشل إنشاء عملية الدفع عبر PayTabs: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    if (!data.redirect_url) {
      throw new Error(`لم يُرجع PayTabs رابط دفع صالحًا: ${JSON.stringify(data).slice(0, 200)}`);
    }

    return { kind: "redirect", redirectUrl: data.redirect_url as string, gatewayRef: data.tran_ref as string };
  },
};

/**
 * تحقق توقيع الإشعار الفوري (IPN/Callback) — الأسلوب الموثَّق رسميًا من PayTabs:
 * HMAC-SHA256 لكامل جسم الطلب الخام (كما وصل بالضبط، قبل أي تحليل JSON) بمفتاح Server Key،
 * ومقارنة زمن-ثابت لمنع هجمات القياس الزمني (timing attack) على التوقيع.
 */
export function verifyPaytabsSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const { serverKey } = requireCredentials();
  const expected = createHmac("sha256", serverKey).update(rawBody, "utf8").digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(signatureHeader, "utf8");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

/**
 * تحقق توقيع رابط العودة للمتصفح — خوارزمية مختلفة شكليًا عن الـCallback حسب توثيق PayTabs:
 * إزالة حقل signature، حذف الحقول الفارغة، ترتيب أبجدي بالمفاتيح، تحويل لـquery string
 * (بترميز URL)، ثم نفس HMAC-SHA256.
 */
export function verifyPaytabsReturnSignature(fields: Record<string, string>): boolean {
  const { signature, ...rest } = fields;
  if (!signature) return false;

  const filtered = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== "" && v !== undefined));
  const sortedKeys = Object.keys(filtered).sort();
  const query = sortedKeys.map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(filtered[k])}`).join("&");

  return verifyPaytabsSignature(query, signature);
}
