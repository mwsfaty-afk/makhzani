import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const { companyId } = await requireTenant();

  const balances = await prisma.stockBalance.findMany({
    where: { companyId, qty: { not: 0 } },
    include: { item: true, warehouse: true },
    orderBy: [{ item: { nameAr: "asc" } }],
  });

  const csv = toCsv(
    ["الصنف", "المخزن", "الكمية", "متوسط التكلفة", "القيمة"],
    balances.map((b) => {
      const qty = Number(b.qty);
      const avgCost = Number(b.avgCost);
      return [b.item.nameAr ?? b.item.name, b.warehouse.name, qty, avgCost, qty * avgCost];
    }),
  );

  return csvResponse("inventory-valuation.csv", csv);
}
