import type { Company, Payment, Plan } from "@prisma/client";

export type CheckoutContext = {
  payment: Payment;
  plan: Plan;
  company: Company;
  returnUrl: string;
  cancelUrl: string;
};

export type CheckoutResult =
  | { kind: "redirect"; redirectUrl: string; gatewayRef?: string }
  | { kind: "manual"; instructions: string };

/**
 * واجهة موحّدة لكل بوابات الدفع (docs/ARCHITECTURE.md §8.1) — أي بوابة جديدة (PayTabs
 * مستقبلًا، Paymob لاحقًا...) تُطبَّق كتطبيق جديد لنفس الواجهة دون أي تعديل في منطق
 * الاشتراكات/الخطط/الحدود.
 */
export interface PaymentGateway {
  code: string;
  /** يبدأ عملية الدفع: إما رابط تحويل لبوابة خارجية (PayPal) أو تعليمات دفع يدوي. */
  createCheckout(ctx: CheckoutContext): Promise<CheckoutResult>;
  /** تحقّق اختياري من Webhook خارجي (دفاع إضافي بجانب مسار الـ return الأساسي). */
  verifyWebhook?(payload: unknown, headers: Headers): Promise<{ gatewayRef: string; success: boolean } | null>;
}
