import { prisma } from "@/lib/db/prisma";

/** الدولة المرجعية لعرض الأسعار العامة في الصفحة الرئيسية (السعودية أولًا حسب استهداف
 * السوق، docs/ARCHITECTURE.md §8.2) — نفس مصدر الحقيقة المستخدم في `/dashboard/billing`
 * و`/admin/plans`، وليس نسخة ثانية من بيانات الأسعار. */
const REFERENCE_COUNTRY = "SA";

export async function getPublicPlans() {
  const plans = await prisma.plan.findMany({
    where: { isPublic: true, isActive: true, isTrial: false },
    orderBy: { sortOrder: "asc" },
    include: { prices: { where: { countryCode: REFERENCE_COUNTRY } } },
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
