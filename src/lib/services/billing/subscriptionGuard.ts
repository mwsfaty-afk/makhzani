import { cache } from "react";
import { prisma } from "@/lib/db/prisma";

export class SubscriptionExpiredError extends Error {
  constructor() {
    super("انتهت صلاحية الاشتراك أو الفترة التجريبية. البيانات الحالية متاحة للعرض فقط — يرجى تجديد الاشتراك من صفحة الفوترة للمتابعة في الإنشاء والتعديل.");
    this.name = "SubscriptionExpiredError";
  }
}

const WRITABLE_STATUSES = new Set(["TRIALING", "ACTIVE"]);

/**
 * يجلب اشتراك الشركة، ويُصحّح حالته تلقائيًا (Lazy Expiry) إن تجاوز `currentPeriodEnd`
 * دون انتظار Cron اليومي — بحيث يبقى فرض القراءة فقط/المنع صحيحًا فورًا حتى قبل تشغيل
 * `/api/cron/check-subscriptions` (بند 8.5 في docs/ARCHITECTURE.md).
 *
 * ملفوفة بـ React `cache()` — كل كتابة تمر عبر tenantPrisma() تستدعي هذه الدالة (مرة عبر
 * assertSubscriptionActive، ومرة أخرى عبر enforceCountLimit عند الإنشاء)، وأي عملية حفظ
 * بعدة أسطر (فاتورة بعدة أصناف) تكرر النداء لكل صف يُكتب. بدون هذا الكاش، كل نداء كان
 * يعني رحلة إضافية لقاعدة بيانات بعيدة جغرافيًا (Supabase eu-west-1) — قد تتضاعف زمن الحفظ
 * عدة مرات لفاتورة واحدة. الكاش مؤقت (لعمر الطلب الواحد فقط)، فلا يؤثر على صحة "الانتهاء
 * الفوري" للاشتراك بين الطلبات.
 */
export const getSubscriptionWithPlan = cache(async (companyId: number) => {
  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
    include: { plan: true },
  });
  if (!subscription) throw new Error("لا يوجد اشتراك مسجَّل لهذه الشركة");

  if (WRITABLE_STATUSES.has(subscription.status) && subscription.currentPeriodEnd < new Date()) {
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "EXPIRED" },
      include: { plan: true },
    });
    return updated;
  }

  return subscription;
});

/** يُستدعى في بداية أي عملية إنشاء/تعديل/اعتماد تمر عبر `prisma.$transaction` الخام
 * (خارج نطاق tenantPrisma()، الذي يفرض هذا الفحص تلقائيًا لكل الكتابات المارة به). */
export async function assertSubscriptionActive(companyId: number) {
  const subscription = await getSubscriptionWithPlan(companyId);
  if (!WRITABLE_STATUSES.has(subscription.status)) {
    throw new SubscriptionExpiredError();
  }
  return subscription;
}
