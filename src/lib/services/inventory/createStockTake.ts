import { prisma } from "@/lib/db/prisma";
import { nextDocumentNumber } from "@/lib/services/documentNumbering";
import { assertSubscriptionActive } from "@/lib/services/billing/subscriptionGuard";

/**
 * تجهيز جرد كامل لمخزن (بند 29): يلتقط الرصيد الدفتري الحالي لكل صنف له رصيد في هذا
 * المخزن كنقطة بداية — لا يؤثر على شيء بعد (مسودة). العد الفعلي يُدخَل لاحقًا ثم يُعتمد.
 */
export async function createStockTake(input: { companyId: number; userId: number; warehouseId: number }) {
  await assertSubscriptionActive(input.companyId);
  const balances = await prisma.stockBalance.findMany({
    where: { companyId: input.companyId, warehouseId: input.warehouseId },
    include: { item: true },
  });
  if (balances.length === 0) {
    throw new Error("لا توجد أصناف لها رصيد في هذا المخزن لجردها");
  }

  return prisma.$transaction(async (tx) => {
    const docNo = await nextDocumentNumber(tx, input.companyId, "stock_take");

    const stockTake = await tx.stockTake.create({
      data: {
        companyId: input.companyId,
        docNo,
        date: new Date(),
        warehouseId: input.warehouseId,
        scope: "full",
        status: "DRAFT",
        userId: input.userId,
        items: {
          create: balances.map((b) => ({
            itemId: b.itemId,
            bookQty: b.qty,
            actualQty: b.qty,
            unitCost: b.avgCost,
          })),
        },
      } as never,
    });

    return stockTake;
  });
}
