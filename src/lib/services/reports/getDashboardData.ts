import { prisma } from "@/lib/db/prisma";

function startOf(date: Date, unit: "day" | "week" | "month") {
  const d = new Date(date);
  if (unit === "day") {
    d.setHours(0, 0, 0, 0);
  } else if (unit === "week") {
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

async function sumPosted(model: "sale" | "purchase", companyId: number, from: Date, to: Date) {
  const result =
    model === "sale"
      ? await prisma.sale.aggregate({
          where: { companyId, status: "POSTED", date: { gte: from, lte: to } },
          _sum: { grandTotal: true },
        })
      : await prisma.purchase.aggregate({
          where: { companyId, status: "POSTED", date: { gte: from, lte: to } },
          _sum: { grandTotal: true },
        });
  return Number(result._sum.grandTotal ?? 0);
}

export async function getDashboardData(companyId: number) {
  const now = new Date();
  const todayStart = startOf(now, "day");
  const weekStart = startOf(now, "week");
  const monthStart = startOf(now, "month");
  const lastMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const lastMonthEnd = new Date(monthStart.getTime() - 1);

  const [
    salesToday,
    salesWeek,
    salesMonth,
    salesLastMonth,
    purchasesToday,
    purchasesMonth,
    itemCount,
    stockBalances,
    cashBoxes,
    customers,
    suppliers,
    profitMonth,
    topSuppliers,
    dailySales14,
    dailyPurchases14,
  ] = await Promise.all([
    sumPosted("sale", companyId, todayStart, now),
    sumPosted("sale", companyId, weekStart, now),
    sumPosted("sale", companyId, monthStart, now),
    sumPosted("sale", companyId, lastMonthStart, lastMonthEnd),
    sumPosted("purchase", companyId, todayStart, now),
    sumPosted("purchase", companyId, monthStart, now),
    prisma.item.count({ where: { companyId, isActive: true } }),
    prisma.stockBalance.findMany({ where: { companyId }, select: { qty: true, avgCost: true } }),
    prisma.cashBox.findMany({ where: { companyId }, select: { id: true } }),
    prisma.customer.findMany({ where: { companyId }, select: { id: true, openingBalance: true } }),
    prisma.supplier.findMany({ where: { companyId }, select: { id: true, openingBalance: true } }),
    prisma.sale.aggregate({
      where: { companyId, status: "POSTED", date: { gte: monthStart, lte: now } },
      _sum: { totalProfit: true },
    }),
    prisma.purchase.groupBy({
      by: ["supplierId"],
      where: { companyId, status: "POSTED", date: { gte: monthStart, lte: now } },
      _sum: { grandTotal: true },
      orderBy: { _sum: { grandTotal: "desc" } },
      take: 5,
    }),
    prisma.sale.groupBy({
      by: ["date"],
      where: { companyId, status: "POSTED", date: { gte: new Date(now.getTime() - 13 * 86400000) } },
      _sum: { grandTotal: true },
    }),
    prisma.purchase.groupBy({
      by: ["date"],
      where: { companyId, status: "POSTED", date: { gte: new Date(now.getTime() - 13 * 86400000) } },
      _sum: { grandTotal: true },
    }),
  ]);

  const inventoryValue = stockBalances.reduce((sum, b) => sum + Number(b.qty) * Number(b.avgCost), 0);

  // مُحسَّن عن نمط N+1 (استعلام منفصل لكل عميل/مورد/خزينة) إلى عدد ثابت من الاستعلامات
  // بصرف النظر عن عدد الصفوف — يهم فعليًا عند شركة بمئات العملاء/الموردين، وليس تحسينًا
  // مبكرًا: نفس الفرق بين استعلام واحد ومئات الاستعلامات المتزامنة على كل تحميل للوحة.
  const [cashSums, latestCustomerTx, latestSupplierTx] = await Promise.all([
    prisma.cashTransaction.groupBy({ by: ["cashBoxId", "direction"], where: { companyId }, _sum: { amount: true } }),
    customers.length === 0
      ? Promise.resolve([])
      : prisma.customerTransaction.groupBy({ by: ["customerId"], where: { companyId }, _max: { id: true } }),
    suppliers.length === 0
      ? Promise.resolve([])
      : prisma.supplierTransaction.groupBy({ by: ["supplierId"], where: { companyId }, _max: { id: true } }),
  ]);

  const cashSumByBox = new Map<number, { in: number; out: number }>();
  for (const row of cashSums) {
    const entry = cashSumByBox.get(row.cashBoxId) ?? { in: 0, out: 0 };
    if (row.direction === "IN") entry.in = Number(row._sum.amount ?? 0);
    else entry.out = Number(row._sum.amount ?? 0);
    cashSumByBox.set(row.cashBoxId, entry);
  }
  const cashBalances = cashBoxes.map((box) => {
    const sums = cashSumByBox.get(box.id) ?? { in: 0, out: 0 };
    return sums.in - sums.out;
  });

  const customerLatestIds = latestCustomerTx.map((r) => r._max.id).filter((id): id is number => id !== null);
  const customerTxRows =
    customerLatestIds.length === 0 ? [] : await prisma.customerTransaction.findMany({ where: { id: { in: customerLatestIds } } });
  const balanceByCustomerId = new Map(customerTxRows.map((t) => [t.customerId, Number(t.balanceAfter)]));
  const customerBalances = customers.map((c) => balanceByCustomerId.get(c.id) ?? Number(c.openingBalance));

  const supplierLatestIds = latestSupplierTx.map((r) => r._max.id).filter((id): id is number => id !== null);
  const supplierTxRows =
    supplierLatestIds.length === 0 ? [] : await prisma.supplierTransaction.findMany({ where: { id: { in: supplierLatestIds } } });
  const balanceBySupplierId = new Map(supplierTxRows.map((t) => [t.supplierId, Number(t.balanceAfter)]));
  const supplierBalances = suppliers.map((s) => balanceBySupplierId.get(s.id) ?? Number(s.openingBalance));

  const supplierIds = topSuppliers.map((s) => s.supplierId);
  const supplierRecords = await prisma.supplier.findMany({ where: { id: { in: supplierIds } } });
  const supplierNameById = new Map(supplierRecords.map((s) => [s.id, s.name]));

  // دمج المبيعات والمشتريات اليومية لآخر 14 يوم في مصفوفة واحدة متسلسلة للرسم البياني
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const salesByDay = new Map<string, number>();
  for (const row of dailySales14) salesByDay.set(dayKey(row.date), Number(row._sum.grandTotal ?? 0));
  const purchasesByDay = new Map<string, number>();
  for (const row of dailyPurchases14) purchasesByDay.set(dayKey(row.date), Number(row._sum.grandTotal ?? 0));

  const trend: { date: string; sales: number; purchases: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = dayKey(d);
    trend.push({ date: key, sales: salesByDay.get(key) ?? 0, purchases: purchasesByDay.get(key) ?? 0 });
  }

  return {
    sales: { today: salesToday, week: salesWeek, month: salesMonth, lastMonth: salesLastMonth },
    purchases: { today: purchasesToday, month: purchasesMonth },
    profitMonth: Number(profitMonth._sum.totalProfit ?? 0),
    inventory: { itemCount, value: inventoryValue },
    cashTotal: cashBalances.reduce((s, v) => s + v, 0),
    customerDebtTotal: customerBalances.reduce((s, v) => s + v, 0),
    supplierDebtTotal: supplierBalances.reduce((s, v) => s + v, 0),
    topSuppliers: topSuppliers.map((s) => ({
      name: supplierNameById.get(s.supplierId) ?? "—",
      total: Number(s._sum.grandTotal ?? 0),
    })),
    trend,
  };
}
