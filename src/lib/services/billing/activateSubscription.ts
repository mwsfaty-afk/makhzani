import { prisma } from "@/lib/db/prisma";

export class PaymentAlreadyProcessedError extends Error {
  constructor() {
    super("هذه الدفعة تمت مراجعتها بالفعل");
    this.name = "PaymentAlreadyProcessedError";
  }
}

/**
 * نقطة التفعيل الوحيدة بعد نجاح أي دفعة — سواء عبر مسار عودة PayPal بعد Capture ناجح،
 * أو موافقة أدمن المنصة على دفعة يدوية. تُحدَّث الدفعة والاشتراك معًا ضمن Transaction
 * واحدة: لا حالة وسيطة (دفعة PAID بدون تفعيل اشتراك، أو العكس).
 */
export async function activateSubscriptionFromPayment(
  paymentId: number,
  opts: { gatewayRef?: string; reviewedByAdminId?: number } = {},
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { plan: true } });
    if (payment.status !== "PENDING") throw new PaymentAlreadyProcessedError();

    const now = new Date();
    const currentPeriodEnd =
      payment.plan.durationDays > 0 ? new Date(now.getTime() + payment.plan.durationDays * 24 * 60 * 60 * 1000) : now;

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        paidAt: now,
        gatewayRef: opts.gatewayRef ?? payment.gatewayRef,
        reviewedByAdminId: opts.reviewedByAdminId,
        reviewedAt: opts.reviewedByAdminId ? now : undefined,
      },
    });

    const subscription = await tx.subscription.update({
      where: { id: payment.subscriptionId },
      data: {
        planId: payment.planId,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
    });

    return subscription;
  });
}

/** رفض دفعة يدوية معلَّقة — لا يُغيّر الاشتراك، فقط يُسجّل السبب ومَن راجعها. */
export async function rejectManualPayment(paymentId: number, adminId: number, reason: string) {
  return prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "FAILED",
      rejectionReason: reason,
      reviewedByAdminId: adminId,
      reviewedAt: new Date(),
    },
  });
}
