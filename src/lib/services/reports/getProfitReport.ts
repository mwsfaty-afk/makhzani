import { prisma } from "@/lib/db/prisma";

/**
 * تقرير الأرباح (بند 31، 42): يعتمد بالكامل على القيم المحسوبة أثناء اعتماد فاتورة البيع
 * (SaleItem.profit/totalCost) — لا يُعاد حساب أي تكلفة هنا، فقط تجميع لما هو محفوظ بالفعل.
 * فقط الفواتير المعتمدة (POSTED) تدخل في الحساب.
 */
export async function getProfitReport(companyId: number, dateFrom: Date, dateTo: Date) {
  const saleWhere = {
    companyId,
    status: "POSTED" as const,
    date: { gte: dateFrom, lte: dateTo },
  };

  const [summary, byItemRaw, byCustomerRaw, byWarehouseRaw] = await Promise.all([
    prisma.sale.aggregate({
      where: saleWhere,
      _sum: { grandTotal: true, taxTotal: true, totalCost: true, totalProfit: true },
      _count: true,
    }),
    prisma.saleItem.groupBy({
      by: ["itemId"],
      where: { sale: saleWhere },
      _sum: { qty: true, total: true, tax: true, totalCost: true, profit: true },
      orderBy: { _sum: { profit: "desc" } },
    }),
    prisma.sale.groupBy({
      by: ["customerId"],
      where: saleWhere,
      _sum: { grandTotal: true, taxTotal: true, totalCost: true, totalProfit: true },
      orderBy: { _sum: { totalProfit: "desc" } },
    }),
    prisma.sale.groupBy({
      by: ["warehouseId"],
      where: saleWhere,
      _sum: { grandTotal: true, taxTotal: true, totalCost: true, totalProfit: true },
      orderBy: { _sum: { totalProfit: "desc" } },
    }),
  ]);

  const [items, customers, warehouses] = await Promise.all([
    prisma.item.findMany({ where: { id: { in: byItemRaw.map((r) => r.itemId) } } }),
    prisma.customer.findMany({ where: { id: { in: byCustomerRaw.map((r) => r.customerId) } } }),
    prisma.warehouse.findMany({ where: { id: { in: byWarehouseRaw.map((r) => r.warehouseId) } } }),
  ]);
  const itemById = new Map(items.map((i) => [i.id, i]));
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const warehouseById = new Map(warehouses.map((w) => [w.id, w]));

  const revenue = Number(summary._sum.grandTotal ?? 0) - Number(summary._sum.taxTotal ?? 0);
  const cost = Number(summary._sum.totalCost ?? 0);
  const profit = Number(summary._sum.totalProfit ?? 0);

  return {
    summary: {
      invoiceCount: summary._count,
      revenue,
      cost,
      profit,
      marginPercent: revenue > 0 ? (profit / revenue) * 100 : 0,
    },
    byItem: byItemRaw.map((r) => ({
      itemId: r.itemId,
      label: itemById.get(r.itemId)?.nameAr ?? itemById.get(r.itemId)?.name ?? "—",
      qty: Number(r._sum.qty ?? 0),
      revenue: Number(r._sum.total ?? 0) - Number(r._sum.tax ?? 0),
      cost: Number(r._sum.totalCost ?? 0),
      profit: Number(r._sum.profit ?? 0),
    })),
    byCustomer: byCustomerRaw.map((r) => ({
      customerId: r.customerId,
      label: customerById.get(r.customerId)?.name ?? "—",
      revenue: Number(r._sum.grandTotal ?? 0) - Number(r._sum.taxTotal ?? 0),
      cost: Number(r._sum.totalCost ?? 0),
      profit: Number(r._sum.totalProfit ?? 0),
    })),
    byWarehouse: byWarehouseRaw.map((r) => ({
      warehouseId: r.warehouseId,
      label: warehouseById.get(r.warehouseId)?.name ?? "—",
      revenue: Number(r._sum.grandTotal ?? 0) - Number(r._sum.taxTotal ?? 0),
      cost: Number(r._sum.totalCost ?? 0),
      profit: Number(r._sum.totalProfit ?? 0),
    })),
  };
}
