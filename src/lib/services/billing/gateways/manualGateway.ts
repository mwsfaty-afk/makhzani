import type { PaymentGateway, CheckoutContext, CheckoutResult } from "./types";

/** بيانات الاستلام تُقرأ من متغيرات بيئة قابلة للتعديل دون نشر جديد — قيم افتراضية
 * توضيحية إلى أن يُدخل صاحب المنصة الأرقام الفعلية. */
const MANUAL_METHOD_INFO: Record<string, { labelAr: string; instructions: () => string }> = {
  vodafone_cash: {
    labelAr: "فودافون كاش",
    instructions: () =>
      `حوّل المبلغ إلى رقم فودافون كاش: ${process.env.VODAFONE_CASH_NUMBER ?? "(سيُحدَّد لاحقًا)"}\n` +
      `ثم أدخل رقم العملية (Transaction ID) وارفع لقطة شاشة/إيصال التحويل أدناه.`,
  },
  al_rajhi_bank: {
    labelAr: "تحويل بنكي — بنك الراجحي",
    instructions: () =>
      `اسم الحساب: ${process.env.AL_RAJHI_ACCOUNT_NAME ?? "(سيُحدَّد لاحقًا)"}\n` +
      `رقم الآيبان: ${process.env.AL_RAJHI_IBAN ?? "(سيُحدَّد لاحقًا)"}\n` +
      `ثم أدخل رقم المرجع/الحوالة وارفع إيصال التحويل أدناه.`,
  },
};

/** بوابة يدوية مشتركة لكل طرق الدفع التي لا تملك تكاملًا آليًا (فودافون كاش، تحويل
 * بنكي...) — لا تحصيل فعلي هنا؛ فقط تسجيل الدفعة كـ PENDING وعرض تعليمات، على أن
 * يُدخل العميل رقم المرجع ويرفع إثبات الدفع، ثم يُراجعها أدمن المنصة قبل التفعيل
 * (docs/ARCHITECTURE.md §8.1 — لا يوجد Silent Activation لأي طريقة دفع يدوية). */
export function manualGateway(methodCode: string): PaymentGateway {
  const info = MANUAL_METHOD_INFO[methodCode];
  if (!info) throw new Error(`طريقة دفع يدوية غير معروفة: ${methodCode}`);

  return {
    code: methodCode,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx غير مستخدم هنا لكن الواجهة PaymentGateway تتطلبه
    async createCheckout(_ctx: CheckoutContext): Promise<CheckoutResult> {
      return { kind: "manual", instructions: info.instructions() };
    },
  };
}

export function manualMethodLabel(code: string): string {
  return MANUAL_METHOD_INFO[code]?.labelAr ?? code;
}

export const MANUAL_METHOD_CODES = Object.keys(MANUAL_METHOD_INFO);
