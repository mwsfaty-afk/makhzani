import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { toCsv, csvResponse } from "@/lib/csv";

const DAY_OPTIONS = [30, 60, 90] as const;

export async function GET(request: Request) {
  const { companyId } = await requireTenant();
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { expiryTrackingEnabled: true } });
  if (!company.expiryTrackingEnabled) return new Response(null, { status: 404 });

  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days");
  const days = DAY_OPTIONS.includes(Number(daysParam) as never) ? Number(daysParam) : 60;

  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const [movements, balances] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { companyId, expiryDate: { not: null, lte: cutoff } },
      include: { item: true, warehouse: true },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.stockBalance.findMany({ where: { companyId, qty: { gt: 0 } } }),
  ]);

  const balanceMap = new Map(balances.map((b) => [`${b.itemId}-${b.warehouseId}`, Number(b.qty)]));
  const seen = new Set<string>();
  const rows = movements.flatMap((m) => {
    const key = `${m.itemId}-${m.warehouseId}`;
    const currentQty = balanceMap.get(key);
    if (!currentQty || seen.has(key)) return [];
    seen.add(key);
    return [
      [m.item.nameAr ?? m.item.name, m.item.code, m.warehouse.name, currentQty, m.expiryDate!.toISOString().slice(0, 10)] as (
        | string
        | number
      )[],
    ];
  });

  const csv = toCsv(["الصنف", "الكود", "المخزن", "الرصيد الحالي", "تاريخ الصلاحية"], rows);
  return csvResponse("expiring.csv", csv);
}
