import { prisma } from "@/lib/db/prisma";

const SUBSCRIPTION_EXPIRING_DAYS = 3;
const DEDUP_WINDOW_HOURS = 24;

/**
 * يزامن جدول Notification مع الحالة الفعلية للشركة الآن — بدل تسجيل حدث لحظة حدوثه في كل
 * نقطة من الكود (نقص كمية عند البيع، تجاوز حد ائتمان عند فاتورة...)، نعيد حساب "ما الذي
 * يستحق تنبيهًا الآن" في كل مرة تُفتح فيها لوحة التحكم، وهذا أبسط بكثير ولا يحتاج ربط هذا
 * الجدول بكل مسار كتابة في النظام.
 *
 * التكرار مُتحكَّم فيه بفحص وجود تنبيه لنفس `type` و`link` خلال آخر 24 ساعة (**بصرف النظر
 * عن كونه مقروءًا أو لا** — وليس "غير مقروء" فقط). فحص "غير مقروء فقط" كان يُعيد إنشاء
 * نفس التنبيه فورًا في أول Sync تالٍ لمجرد أن المستخدم علّمه كمقروء رغم أن الحالة نفسها
 * (نقص المخزون مثلًا) لم تتغيّر فعليًا — تكرار مزعج بلا فائدة. النافذة الزمنية 24 ساعة
 * تمنع هذا التكرار في نفس اليوم، وتسمح بتذكير جديد إن استمرت المشكلة لليوم التالي.
 * أي تنبيه غير مقروء لحالة زالت (مثلًا صنف أُعيد تخزينه) يُعلَّم كمقروء تلقائيًا.
 */
export async function syncNotifications(companyId: number): Promise<void> {
  const [lowStockRows, subscription, customers] = await Promise.all([
    prisma.item.findMany({
      where: { companyId, isActive: true, reorderPoint: { gt: 0 } },
      include: { stockBalances: true },
    }),
    prisma.subscription.findUnique({ where: { companyId } }),
    prisma.customer.findMany({ where: { companyId, isActive: true, creditLimit: { gt: 0 } } }),
  ]);

  const dedupSince = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000);
  const [existingUnread, recentAny] = await Promise.all([
    prisma.notification.findMany({ where: { companyId, isRead: false }, select: { id: true, type: true, link: true } }),
    prisma.notification.findMany({
      where: { companyId, createdAt: { gte: dedupSince } },
      select: { type: true, link: true },
    }),
  ]);
  const dedupKey = (type: string, link: string) => `${type}::${link}`;
  const recentKeys = new Set(recentAny.map((n) => dedupKey(n.type, n.link ?? "")));
  const stillValidKeys = new Set<string>();
  const toCreate: { type: string; title: string; message: string; link: string }[] = [];

  // 1) تنبيهات نقص المخزون
  for (const item of lowStockRows) {
    const qty = item.stockBalances.reduce((sum, b) => sum + Number(b.qty), 0);
    if (qty > Number(item.reorderPoint)) continue;
    const link = `/dashboard/inventory/stock/${item.id}`;
    const key = dedupKey("low_stock", link);
    stillValidKeys.add(key);
    if (!recentKeys.has(key)) {
      toCreate.push({
        type: "low_stock",
        title: "نقص في المخزون",
        message: `رصيد "${item.nameAr ?? item.name}" وصل ${qty.toLocaleString("ar")} — عند أو تحت حد إعادة الطلب (${Number(item.reorderPoint).toLocaleString("ar")}).`,
        link,
      });
    }
  }

  // 2) تنبيه اقتراب انتهاء الاشتراك
  if (subscription && (subscription.status === "ACTIVE" || subscription.status === "TRIALING")) {
    const daysLeft = Math.ceil((subscription.currentPeriodEnd.getTime() - Date.now()) / 86400000);
    const link = "/dashboard/billing";
    if (daysLeft <= SUBSCRIPTION_EXPIRING_DAYS) {
      const key = dedupKey("subscription_expiring", link);
      stillValidKeys.add(key);
      if (!recentKeys.has(key)) {
        toCreate.push({
          type: "subscription_expiring",
          title: "اشتراكك على وشك الانتهاء",
          message:
            daysLeft <= 0
              ? "انتهت صلاحية اشتراكك — جدّده الآن لتفادي تعطيل إنشاء المستندات الجديدة."
              : `تبقّى ${daysLeft} يوم${daysLeft === 1 ? "" : "ًا"} على انتهاء اشتراكك الحالي.`,
          link,
        });
      }
    }
  }

  // 3) تنبيهات تجاوز حد ائتمان العملاء
  if (customers.length > 0) {
    const lastTxns = await prisma.customerTransaction.findMany({
      where: { companyId, customerId: { in: customers.map((c) => c.id) } },
      orderBy: { id: "desc" },
      distinct: ["customerId"],
    });
    const lastTxnByCustomer = new Map(lastTxns.map((t) => [t.customerId, t]));

    for (const customer of customers) {
      const balance = Number(lastTxnByCustomer.get(customer.id)?.balanceAfter ?? customer.openingBalance);
      if (balance <= Number(customer.creditLimit)) continue;
      const link = `/dashboard/customers/${customer.id}`;
      const key = dedupKey("credit_limit", link);
      stillValidKeys.add(key);
      if (!recentKeys.has(key)) {
        toCreate.push({
          type: "credit_limit",
          title: "تجاوز حد الائتمان",
          message: `رصيد "${customer.name}" (${balance.toLocaleString("ar")}) تجاوز حد الائتمان المسموح (${Number(customer.creditLimit).toLocaleString("ar")}).`,
          link,
        });
      }
    }
  }

  // تعليم أي تنبيه غير مقروء زالت حالته (مثلًا صنف أُعيد تخزينه) كمقروء تلقائيًا
  const resolvedIds = existingUnread
    .filter((n) => !stillValidKeys.has(dedupKey(n.type, n.link ?? "")))
    .map((n) => n.id);

  await prisma.$transaction([
    ...(resolvedIds.length > 0
      ? [prisma.notification.updateMany({ where: { id: { in: resolvedIds } }, data: { isRead: true } })]
      : []),
    ...(toCreate.length > 0
      ? [prisma.notification.createMany({ data: toCreate.map((n) => ({ companyId, ...n })) })]
      : []),
  ]);
}
