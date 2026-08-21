import { prisma } from "@/lib/db/prisma";
import type { Company, Plan } from "@prisma/client";

/** سعر الخطة الفعلي لشركة معيّنة (docs/ARCHITECTURE.md §8.2): سطر PlanPrice مطابق
 * لدولة الشركة إن وُجد، وإلا سعر/عملة الخطة الافتراضيين (EGP). */
export async function getPlanPriceForCompany(plan: Plan, company: Company): Promise<{ amount: number; currency: string }> {
  const specific = await prisma.planPrice.findUnique({
    where: { planId_countryCode: { planId: plan.id, countryCode: company.country } },
  });
  if (specific) return { amount: Number(specific.price), currency: specific.currency };
  return { amount: Number(plan.price), currency: plan.currency };
}

/** ملحوظة تحويل تقريبية للعرض فقط (§8.2) — تُبنى من ExchangeRateNote، ولا تُستخدم أبدًا
 * كأساس فعلي للفوترة. تُعاد null إن لم يوجد سعر صرف محفوظ لهذا الزوج من العملات. */
export async function getApproxConversionNote(fromCurrency: string, toCurrency: string): Promise<string | null> {
  if (fromCurrency === toCurrency) return null;
  const rate = await prisma.exchangeRateNote.findUnique({
    where: { baseCurrency_targetCurrency: { baseCurrency: fromCurrency, targetCurrency: toCurrency } },
  });
  if (!rate) return null;
  return `≈ ${Number(rate.rate).toLocaleString("ar")} ${toCurrency}`;
}
