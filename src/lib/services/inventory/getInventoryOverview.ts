import { prisma } from "@/lib/db/prisma";

const DEAD_STOCK_DAYS = 60;
const EXPIRING_DAYS = 60;
const FAST_MOVING_DAYS = 30;

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * تجميع بيانات "مركز تحكم المخزون" — نفس نمط getDashboardData.ts (Promise.all واحد لكل
 * الاستعلامات المستقلة، بلا N+1)، لكن بمقاييس مخزون بحتة بدل مؤشرات الشركة العامة.
 */
export async function getInventoryOverview(companyId: number) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const deadStockCutoff = new Date(now.getTime() - DEAD_STOCK_DAYS * 24 * 60 * 60 * 1000);
  const expiringCutoff = new Date(now.getTime() + EXPIRING_DAYS * 24 * 60 * 60 * 1000);
  const fastMovingFrom = new Date(now.getTime() - FAST_MOVING_DAYS * 24 * 60 * 60 * 1000);

  const [
    balances,
    lastOutMovements,
    expiringMovements,
    fastMovingGrouped,
    todayMovementCount,
    todayInCount,
    todayOutCount,
    recentMovements,
    warehouses,
  ] = await Promise.all([
    prisma.stockBalance.findMany({ where: { companyId, qty: { gt: 0 } }, select: { itemId: true, warehouseId: true, qty: true, avgCost: true } }),
    prisma.stockMovement.groupBy({
      by: ["itemId", "warehouseId"],
      where: { companyId, qtyOut: { gt: 0 } },
      _max: { movementDate: true },
    }),
    prisma.stockMovement.findMany({
      where: { companyId, expiryDate: { not: null, lte: expiringCutoff } },
      select: { itemId: true, warehouseId: true },
      distinct: ["itemId", "warehouseId"],
    }),
    prisma.stockMovement.groupBy({
      by: ["itemId"],
      where: { companyId, qtyOut: { gt: 0 }, movementDate: { gte: fastMovingFrom } },
      _sum: { qtyOut: true },
      orderBy: { _sum: { qtyOut: "desc" } },
      take: 5,
    }),
    prisma.stockMovement.count({ where: { companyId, movementDate: { gte: todayStart } } }),
    prisma.stockMovement.count({ where: { companyId, movementDate: { gte: todayStart }, qtyIn: { gt: 0 } } }),
    prisma.stockMovement.count({ where: { companyId, movementDate: { gte: todayStart }, qtyOut: { gt: 0 } } }),
    prisma.stockMovement.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { item: true, warehouse: true },
    }),
    prisma.warehouse.findMany({ where: { companyId, isActive: true }, select: { id: true, name: true } }),
  ]);

  const lastOutMap = new Map(lastOutMovements.map((m) => [`${m.itemId}-${m.warehouseId}`, m._max.movementDate]));
  const expiringKeys = new Set(expiringMovements.map((m) => `${m.itemId}-${m.warehouseId}`));

  let totalQty = 0;
  let totalValue = 0;
  const distinctItems = new Set<number>();
  let deadStockCount = 0;
  let expiringCount = 0;
  const valueByWarehouse = new Map<number, number>();

  for (const b of balances) {
    const qty = Number(b.qty);
    const value = qty * Number(b.avgCost);
    totalQty += qty;
    totalValue += value;
    distinctItems.add(b.itemId);
    valueByWarehouse.set(b.warehouseId, (valueByWarehouse.get(b.warehouseId) ?? 0) + value);

    const key = `${b.itemId}-${b.warehouseId}`;
    const lastOut = lastOutMap.get(key);
    if (!lastOut || lastOut < deadStockCutoff) deadStockCount++;
    if (expiringKeys.has(key)) expiringCount++;
  }

  const lowStockItems = await prisma.item.findMany({
    where: { companyId, isActive: true, reorderPoint: { gt: 0 } },
    include: { stockBalances: true },
  });
  const lowStockCount = lowStockItems.filter((item) => {
    const qty = item.stockBalances.reduce((sum, b) => sum + Number(b.qty), 0);
    return qty <= Number(item.reorderPoint);
  }).length;

  const fastMovingItemIds = fastMovingGrouped.map((g) => g.itemId);
  const fastMovingItems = fastMovingItemIds.length
    ? await prisma.item.findMany({ where: { id: { in: fastMovingItemIds } } })
    : [];
  const fastMovingItemById = new Map(fastMovingItems.map((i) => [i.id, i]));
  const topFastMoving = fastMovingGrouped.map((g) => ({
    name: fastMovingItemById.get(g.itemId)?.nameAr ?? fastMovingItemById.get(g.itemId)?.name ?? "—",
    totalOut: Number(g._sum.qtyOut ?? 0),
  }));

  const recentActivity = recentMovements.map((m) => ({
    id: m.id.toString(),
    itemName: m.item.nameAr ?? m.item.name,
    warehouseName: m.warehouse.name,
    kind: Number(m.qtyIn) > 0 ? ("in" as const) : ("out" as const),
    qty: Number(m.qtyIn) > 0 ? Number(m.qtyIn) : Number(m.qtyOut),
    documentNo: m.documentNo,
    createdAt: m.createdAt,
  }));

  const warehouseBreakdown = warehouses
    .map((w) => ({ name: w.name, value: valueByWarehouse.get(w.id) ?? 0 }))
    .sort((a, b) => b.value - a.value);

  return {
    itemCount: distinctItems.size,
    totalQty,
    totalValue,
    lowStockCount,
    deadStockCount,
    expiringCount,
    topFastMoving,
    todayMovementCount,
    todayInCount,
    todayOutCount,
    recentActivity,
    warehouseBreakdown,
  };
}
