import type { PaymentGateway, CheckoutContext, CheckoutResult } from "./types";

/**
 * حجز مكان PayTabs كبوابة أولى مستقبلية (docs/ARCHITECTURE.md §8.2 — تغطي السعودية ومصر
 * بتكامل واحد). لم تُنفَّذ بعد فعليًا — هذا Placeholder يطبّق نفس واجهة PaymentGateway
 * فقط، بحيث يمكن تفعيلها لاحقًا بإضافة تنفيذ حقيقي هنا دون أي تعديل في باقي نظام
 * الاشتراكات/الخطط/الحدود أو في واجهة اختيار طريقة الدفع.
 */
export const paytabsGateway: PaymentGateway = {
  code: "paytabs",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx غير مستخدم هنا لكن الواجهة PaymentGateway تتطلبه
  async createCheckout(_ctx: CheckoutContext): Promise<CheckoutResult> {
    throw new Error("بوابة PayTabs لم تُفعَّل بعد على هذه المنصة — جرّب طريقة دفع أخرى حاليًا.");
  },
};
