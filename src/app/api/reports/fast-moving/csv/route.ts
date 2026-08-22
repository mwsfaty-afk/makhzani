import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(request: Request) {
  const { companyId } = await requireTenant();
  const { searchParams } = new URL(request.url);

  const now = new Date();
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const dateFrom = fromParam ? new Date(fromParam) : new Date(now.getFullYear(), now.getMonth(), 1);
  const dateTo = toParam ? new Date(`${toParam}T23:59:59`) : now;

  const grouped = await prisma.stockMovement.groupBy({
    by: ["itemId"],
    where: { companyId, qtyOut: { gt: 0 }, movementDate: { gte: dateFrom, lte: dateTo } },
    _sum: { qtyOut: true },
    orderBy: { _sum: { qtyOut: "desc" } },
    take: 20,
  });

  const items = await prisma.item.findMany({ where: { id: { in: grouped.map((g) => g.itemId) } } });
  const itemById = new Map(items.map((i) => [i.id, i]));

  const rows = grouped.map((g) => {
    const item = itemById.get(g.itemId);
    return [item?.nameAr ?? item?.name ?? "—", item?.code ?? "—", Number(g._sum.qtyOut ?? 0)] as (string | number)[];
  });

  const csv = toCsv(["الصنف", "الكود", "إجمالي الكمية الصادرة"], rows);
  return csvResponse("fast-moving.csv", csv);
}
