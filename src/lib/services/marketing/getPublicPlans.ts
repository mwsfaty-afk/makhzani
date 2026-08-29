import { prisma } from "@/lib/db/prisma";

/** الدولة الافتراضية لعرض الأسعار العامة حين لا يمكن تحديد دولة الزائر (خارج Vercel، أو
 * الهيدر غير متاح) — مصر حسب سعر الخطة الأساسي (EGP، docs/ARCHITECTURE.md §8.2). الدولة
 * الفعلية تُمرَّر من المستدعي (Pricing.tsx) بناءً على هيدر `x-vercel-ip-country`. */
const DEFAULT_COUNTRY = "EG";

export async function getPublicPlans(countryCode: string = DEFAULT_COUNTRY) {
  const plans = await prisma.plan.findMany({
    where: { isPublic: true, isActive: true, isTrial: false },
    orderBy: { sortOrder: "asc" },
    include: { prices: { where: { countryCode } } },
  });

  return plans.map((plan) => {
    const referencePrice = plan.prices[0];
    return {
      code: plan.code,
      nameAr: plan.nameAr,
      description: plan.description,
      price: Number(referencePrice?.price ?? plan.price),
      currency: referencePrice?.currency ?? plan.currency,
      maxUsers: plan.maxUsers,
      maxWarehouses: plan.maxWarehouses,
      maxItems: plan.maxItems,
      maxMonthlyDocuments: plan.maxMonthlyDocuments,
    };
  });
}

export async function getTrialDurationDays(): Promise<number | null> {
  const trial = await prisma.plan.findFirst({ where: { isTrial: true, isActive: true } });
  if (!trial || trial.durationDays <= 0) return null;
  return trial.durationDays;
}
