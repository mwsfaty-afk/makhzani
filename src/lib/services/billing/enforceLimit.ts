import { prisma } from "@/lib/db/prisma";
import { getSubscriptionWithPlan } from "./subscriptionGuard";

export class PlanLimitExceededError extends Error {
  constructor(labelAr: string, max: number) {
    super(`تم الوصول للحد الأقصى لِ${labelAr} في خطتك الحالية (${max}). يرجى ترقية الخطة من صفحة الفوترة للمتابعة.`);
    this.name = "PlanLimitExceededError";
  }
}

type CountableModel = "user" | "branch" | "warehouse" | "item" | "customer" | "supplier";

const LIMIT_FIELD: Record<CountableModel, { planField: string; labelAr: string }> = {
  user: { planField: "maxUsers", labelAr: "عدد المستخدمين" },
  branch: { planField: "maxBranches", labelAr: "عدد الفروع" },
  warehouse: { planField: "maxWarehouses", labelAr: "عدد المخازن" },
  item: { planField: "maxItems", labelAr: "عدد الأصناف" },
  customer: { planField: "maxCustomers", labelAr: "عدد العملاء" },
  supplier: { planField: "maxSuppliers", labelAr: "عدد الموردين" },
};

/** يُفرَض عند إنشاء صف جديد في أحد الجداول المحدودة بالخطة (Item/Customer/Supplier/
 * Warehouse/Branch/User) — يُستدعى من داخل امتداد tenantPrisma() لكل كتابة create. */
async function countRows(model: CountableModel, companyId: number): Promise<number> {
  switch (model) {
    case "user":
      return prisma.user.count({ where: { companyId } });
    case "branch":
      return prisma.branch.count({ where: { companyId } });
    case "warehouse":
      return prisma.warehouse.count({ where: { companyId } });
    case "item":
      return prisma.item.count({ where: { companyId } });
    case "customer":
      return prisma.customer.count({ where: { companyId } });
    case "supplier":
      return prisma.supplier.count({ where: { companyId } });
  }
}

export async function enforceCountLimit(model: CountableModel, companyId: number) {
  const conf = LIMIT_FIELD[model];
  const subscription = await getSubscriptionWithPlan(companyId);
  const max = (subscription.plan as unknown as Record<string, number>)[conf.planField];

  const current = await countRows(model, companyId);

  if (current >= max) {
    throw new PlanLimitExceededError(conf.labelAr, max);
  }
}

export function isCountableModel(model: string): model is Capitalize<CountableModel> {
  return ["User", "Branch", "Warehouse", "Item", "Customer", "Supplier"].includes(model);
}

export function toCountableModelKey(model: string): CountableModel {
  return (model.charAt(0).toLowerCase() + model.slice(1)) as CountableModel;
}

/** فاتورة بيع أو شراء تُحتسَب معًا ضمن حد "المستندات الشهرية" — يُستدعى صراحة من
 * createSale/createPurchase (لا تمر هذه عبر tenantPrisma()، بل عبر prisma.$transaction خام). */
export async function enforceMonthlyDocumentLimit(companyId: number) {
  const subscription = await getSubscriptionWithPlan(companyId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [salesCount, purchasesCount] = await Promise.all([
    prisma.sale.count({ where: { companyId, date: { gte: monthStart } } }),
    prisma.purchase.count({ where: { companyId, date: { gte: monthStart } } }),
  ]);

  const current = salesCount + purchasesCount;
  if (current >= subscription.plan.maxMonthlyDocuments) {
    throw new PlanLimitExceededError("عدد المستندات الشهرية (فواتير بيع وشراء)", subscription.plan.maxMonthlyDocuments);
  }
}
