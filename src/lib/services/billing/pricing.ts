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

/**
 * سعر صرف رقمي خام بين عملتين — استثناء مقصود من قاعدة "العرض فقط" أعلاه، بطلب صريح من
 * المستخدم: بوابة PayTabs (paytabsGateway.ts) لا تقبل حاليًا إلا الجنيه المصري، فأي شركة
 * بعملة أخرى (SAR...) تحتاج تحويلًا فعليًا لمبلغ الفوترة الحقيقي (وليس مجرد استبدال رمز
 * العملة بنفس الرقم). يبحث عن السطر بالاتجاه المباشر (from→to) أولًا، ثم بالاتجاه العكسي
 * (to→from، مقلوبًا) إن لم يوجد — الأدمن قد يُدخل السعر بأي من الاتجاهين من
 * `/omar/system-settings`. يُعيد null إن لم يوجد أي سعر محفوظ إطلاقًا (المستدعي يجب أن
 * يرفض العملية بوضوح، لا أن يخمّن رقمًا).
 */
export async function getConversionRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
  if (fromCurrency === toCurrency) return 1;

  const direct = await prisma.exchangeRateNote.findUnique({
    where: { baseCurrency_targetCurrency: { baseCurrency: fromCurrency, targetCurrency: toCurrency } },
  });
  if (direct) return Number(direct.rate);

  const inverse = await prisma.exchangeRateNote.findUnique({
    where: { baseCurrency_targetCurrency: { baseCurrency: toCurrency, targetCurrency: fromCurrency } },
  });
  if (inverse) return 1 / Number(inverse.rate);

  return null;
}
