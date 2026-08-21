import { prisma } from "@/lib/db/prisma";
import { getGateway } from "./gateways";
import { getPlanPriceForCompany } from "./pricing";
import type { CheckoutResult } from "./gateways/types";

export async function startCheckout(input: {
  companyId: number;
  planId: number;
  gatewayCode: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ paymentId: number; result: CheckoutResult }> {
  const [company, plan, subscription] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: input.companyId } }),
    prisma.plan.findUniqueOrThrow({ where: { id: input.planId } }),
    prisma.subscription.findUniqueOrThrow({ where: { companyId: input.companyId } }),
  ]);
  if (!plan.isActive) throw new Error("هذه الخطة لم تعد متاحة للاشتراك");

  const { amount, currency } = await getPlanPriceForCompany(plan, company);

  const payment = await prisma.payment.create({
    data: {
      subscriptionId: subscription.id,
      companyId: input.companyId,
      planId: plan.id,
      amount,
      currency,
      status: "PENDING",
      gateway: input.gatewayCode,
    },
  });

  const gateway = getGateway(input.gatewayCode);

  try {
    const result = await gateway.createCheckout({
      payment,
      plan,
      company,
      returnUrl: input.returnUrl,
      cancelUrl: input.cancelUrl,
    });

    if (result.kind === "redirect" && result.gatewayRef) {
      await prisma.payment.update({ where: { id: payment.id }, data: { gatewayRef: result.gatewayRef } });
    }

    return { paymentId: payment.id, result };
  } catch (err) {
    // فشل بدء الدفع (بوابة غير مهيأة، خطأ شبكة...) — لا تبقى الدفعة معلَّقة بلا سبب واضح
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", rejectionReason: err instanceof Error ? err.message : "خطأ غير معروف" },
    });
    throw err;
  }
}
