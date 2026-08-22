import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { toCsv, csvResponse } from "@/lib/csv";

const DAY_OPTIONS = [30, 60, 90] as const;

export async function GET(request: Request) {
  const { companyId } = await requireTenant();
  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days");
  const days = DAY_OPTIONS.includes(Number(daysParam) as never) ? Number(daysParam) : 60;

  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const [balances, lastOutMovements] = await Promise.all([
    prisma.stockBalance.findMany({
      where: { companyId, qty: { gt: 0 } },
      include: { item: true, warehouse: true },
    }),
    prisma.stockMovement.groupBy({
      by: ["itemId", "warehouseId"],
      where: { companyId, qtyOut: { gt: 0 } },
      _max: { movementDate: true },
    }),
  ]);

  const lastOutMap = new Map(lastOutMovements.map((m) => [`${m.itemId}-${m.warehouseId}`, m._max.movementDate]));

  const rows = balances.flatMap((b) => {
    const lastOut = lastOutMap.get(`${b.itemId}-${b.warehouseId}`) ?? null;
    const isDead = !lastOut || lastOut < cutoff;
    if (!isDead) return [];
    return [
      [
        b.item.nameAr ?? b.item.name,
        b.item.code,
        b.warehouse.name,
        Number(b.qty),
        lastOut ? lastOut.toISOString().slice(0, 10) : "لم يتحرك إطلاقًا",
      ] as (string | number)[],
    ];
  });

  const csv = toCsv(["الصنف", "الكود", "المخزن", "الرصيد", "آخر حركة صرف"], rows);
  return csvResponse("dead-stock.csv", csv);
}
