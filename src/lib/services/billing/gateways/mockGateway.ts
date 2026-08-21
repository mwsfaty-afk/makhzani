import type { PaymentGateway, CheckoutContext, CheckoutResult } from "./types";
import { activateSubscriptionFromPayment } from "../activateSubscription";

/**
 * بوابة وهمية للتطوير/الاختبار فقط — تُفعّل الاشتراك فورًا دون أي دفع فعلي. **ممنوع
 * استخدامها في الإنتاج** (يُتحقَّق من ذلك في `gateways/index.ts` عبر NODE_ENV، وليس هنا
 * فقط، حتى لا يعتمد المنع على تذكّر كل مستدعٍ التحقق بنفسه).
 */
export const mockGateway: PaymentGateway = {
  code: "mock",
  async createCheckout(ctx: CheckoutContext): Promise<CheckoutResult> {
    await activateSubscriptionFromPayment(ctx.payment.id, { gatewayRef: `MOCK-${ctx.payment.id}` });
    return {
      kind: "redirect",
      redirectUrl: `${ctx.returnUrl}${ctx.returnUrl.includes("?") ? "&" : "?"}mock=success`,
    };
  },
};
