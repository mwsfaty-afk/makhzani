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

    // تحديث شرطي ذرّي (WHERE status = PENDING) — يمنع اعتماد نفس الدفعة مرتين في حال
    // سباق متزامن (مثلًا نقرتان على "اعتماد" في نفس اللحظة، أو تكرار طلب Webhook): لو حدّثت
    // معاملة أخرى نفس الصف بين القراءة أعلاه وهذا السطر، count يكون صفرًا هنا فنرفض بوضوح
    // بدل تفعيل الاشتراك مرتين أو الكتابة فوق قيم بعضهما البعض.
    const updateResult = await tx.payment.updateMany({
      where: { id: paymentId, status: "PENDING" },
      data: {
        status: "PAID",
        paidAt: now,
        gatewayRef: opts.gatewayRef ?? payment.gatewayRef,
        reviewedByAdminId: opts.reviewedByAdminId,
        reviewedAt: opts.reviewedByAdminId ? now : undefined,
      },
    });
    if (updateResult.count === 0) throw new PaymentAlreadyProcessedError();

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

/** رفض دفعة يدوية معلَّقة — لا يُغيّر الاشتراك، فقط يُسجّل السبب ومَن راجعها. تحديث شرطي
 * (WHERE status = PENDING) لنفس سبب activateSubscriptionFromPayment: يمنع رفض دفعة تم
 * اعتمادها بالفعل (سباق بين تبويبي أدمن، أو نقرتين متتاليتين) والكتابة فوق حالتها الصحيحة. */
export async function rejectManualPayment(paymentId: number, adminId: number, reason: string) {
  const result = await prisma.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: {
      status: "FAILED",
      rejectionReason: reason,
      reviewedByAdminId: adminId,
      reviewedAt: new Date(),
    },
  });
  if (result.count === 0) throw new PaymentAlreadyProcessedError();
  return prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
}
