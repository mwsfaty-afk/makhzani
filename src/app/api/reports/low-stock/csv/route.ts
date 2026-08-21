import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const { companyId } = await requireTenant();

  const items = await prisma.item.findMany({
    where: { companyId, isActive: true, reorderPoint: { gt: 0 } },
    include: { stockBalances: true },
  });

  const rows = items.flatMap((item) => {
    const totalQty = item.stockBalances.reduce((sum, b) => sum + Number(b.qty), 0);
    if (totalQty > Number(item.reorderPoint)) return [];
    return [[item.nameAr ?? item.name, item.code, totalQty, Number(item.reorderPoint)] as (string | number)[]];
  });

  const csv = toCsv(["الصنف", "الكود", "الرصيد الحالي", "حد إعادة الطلب"], rows);
  return csvResponse("low-stock.csv", csv);
}
