import { prisma } from "@/lib/db/prisma";

export class PromoCodeInvalidError extends Error {
  constructor() {
    super("كود الترويج غير صحيح أو منتهي الصلاحية");
    this.name = "PromoCodeInvalidError";
  }
}

export class PromoCodeExhaustedError extends Error {
  constructor() {
    super("تم استنفاد الحد الأقصى لاستخدام هذا الكود");
    this.name = "PromoCodeExhaustedError";
  }
}

export class PromoCodeAlreadyUsedError extends Error {
  constructor() {
    super("لقد استخدمت كودًا ترويجيًا من قبل — يمكن استخدام كود واحد فقط لكل حساب");
    this.name = "PromoCodeAlreadyUsedError";
  }
}

/**
 * نقطة الاستبدال الوحيدة لأي كود ترويجي — تُستدعى من التسجيل ومن صفحة الفوترة معًا.
 * نفس نمط الـCAS الذرّي المستخدم في activateSubscriptionFromPayment (updateMany بشرط،
 * ثم فحص count) لمنع تجاوز maxRedemptions عند استخدام متزامن لنفس الكود.
 */
export async function redeemPromoCode(companyId: number, rawCode: string) {
  const code = rawCode.trim().toUpperCase();

  return prisma.$transaction(
    async (tx) => {
      const promo = await tx.promoCode.findUnique({ where: { code }, include: { plan: true } });
      if (!promo || !promo.isActive || (promo.expiresAt && promo.expiresAt < new Date())) {
        throw new PromoCodeInvalidError();
      }

      const alreadyUsed = await tx.promoCodeRedemption.findUnique({ where: { companyId } });
      if (alreadyUsed) throw new PromoCodeAlreadyUsedError();

      const updated = await tx.promoCode.updateMany({
        where: { id: promo.id, redeemedCount: { lt: promo.maxRedemptions } },
        data: { redeemedCount: { increment: 1 } },
      });
      if (updated.count === 0) throw new PromoCodeExhaustedError();

      await tx.promoCodeRedemption.create({ data: { promoCodeId: promo.id, companyId } });

      const now = new Date();
      const currentPeriodEnd = new Date(now.getTime() + promo.durationDays * 24 * 60 * 60 * 1000);
      const subscription = await tx.subscription.upsert({
        where: { companyId },
        update: {
          planId: promo.planId,
          status: "ACTIVE",
          trialEnd: null, // لم يعد اشتراكًا تجريبيًا — يمنع لوحة التحكم من عرض متبقي التجربة القديم بدل مدة الترويج
          currentPeriodStart: now,
          currentPeriodEnd,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
        },
        create: { companyId, planId: promo.planId, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd },
      });

      return { subscription, planNameAr: promo.plan.nameAr };
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
