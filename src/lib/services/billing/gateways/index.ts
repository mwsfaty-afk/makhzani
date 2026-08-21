import type { PaymentGateway } from "./types";
import { paypalGateway } from "./paypalGateway";
import { manualGateway, MANUAL_METHOD_CODES } from "./manualGateway";
import { paytabsGateway } from "./paytabsGateway";
import { mockGateway } from "./mockGateway";

export type { PaymentGateway, CheckoutContext, CheckoutResult } from "./types";
export { manualMethodLabel, MANUAL_METHOD_CODES } from "./manualGateway";
export { capturePaypalOrder } from "./paypalGateway";

/** كل طرق الدفع المعروضة للعميل — التلقائية أولًا ثم اليدوية، وفي بيئة التطوير فقط
 * تُضاف طريقة وهمية للاختبار السريع دون بيانات دفع حقيقية. */
export function listAvailableGatewayCodes(): string[] {
  const codes = ["paypal", ...MANUAL_METHOD_CODES];
  if (process.env.NODE_ENV !== "production") codes.push("mock");
  return codes;
}

/** المدخل الوحيد لجلب تطبيق بوابة دفع بالكود — **يمنع صراحةً** استخدام البوابة الوهمية
 * في الإنتاج حتى لو استُدعيت بالكود مباشرة من مكان آخر، بدل الاعتماد فقط على عدم
 * عرضها في القائمة (بند صريح من طلب المستخدم: لا Silent-PAID لعميل حقيقي في الإنتاج). */
export function getGateway(code: string): PaymentGateway {
  switch (code) {
    case "paypal":
      return paypalGateway;
    case "paytabs":
      return paytabsGateway;
    case "mock":
      if (process.env.NODE_ENV === "production") {
        throw new Error("البوابة الوهمية غير متاحة في بيئة الإنتاج");
      }
      return mockGateway;
    default:
      if (MANUAL_METHOD_CODES.includes(code)) return manualGateway(code);
      throw new Error(`طريقة دفع غير معروفة: ${code}`);
  }
}
