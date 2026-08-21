import { prisma } from "@/lib/db/prisma";
import type { Plan } from "@prisma/client";

export async function getUsageSummary(companyId: number, plan: Plan) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [users, branches, warehouses, items, customers, suppliers, salesThisMonth, purchasesThisMonth] = await Promise.all([
    prisma.user.count({ where: { companyId } }),
    prisma.branch.count({ where: { companyId } }),
    prisma.warehouse.count({ where: { companyId } }),
    prisma.item.count({ where: { companyId } }),
    prisma.customer.count({ where: { companyId } }),
    prisma.supplier.count({ where: { companyId } }),
    prisma.sale.count({ where: { companyId, date: { gte: monthStart } } }),
    prisma.purchase.count({ where: { companyId, date: { gte: monthStart } } }),
  ]);

  return [
    { labelAr: "المستخدمون", current: users, max: plan.maxUsers },
    { labelAr: "الفروع", current: branches, max: plan.maxBranches },
    { labelAr: "المخازن", current: warehouses, max: plan.maxWarehouses },
    { labelAr: "الأصناف", current: items, max: plan.maxItems },
    { labelAr: "العملاء", current: customers, max: plan.maxCustomers },
    { labelAr: "الموردون", current: suppliers, max: plan.maxSuppliers },
    { labelAr: "المستندات هذا الشهر", current: salesThisMonth + purchasesThisMonth, max: plan.maxMonthlyDocuments },
  ];
}
