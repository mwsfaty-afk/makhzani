import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordStockMovement } from "@/lib/services/inventory/stockMovement";

const D = Prisma.Decimal;

/**
 * اعتماد الجرد (بند 29): يحفظ الكميات الفعلية المُدخَلة، ثم لكل صنف — إن كان الفعلي أكبر
 * من الدفتري يُنشئ STOCK_ADJUSTMENT_IN بالفرق، وإن كان أقل يُنشئ STOCK_ADJUSTMENT_OUT
 * بالفرق (بمتوسط التكلفة الحالي وقت الاعتماد، وليس وقت تجهيز الجرد — قد يكونان مختلفين
 * لو حدثت حركات أخرى في الأثناء). فرق صفري لا يُنتج أي حركة.
 */
export async function postStockTake(
  companyId: number,
  stockTakeId: number,
  userId: number,
  counts: { stockTakeItemId: number; actualQty: number }[],
) {
  return prisma.$transaction(
    async (tx) => {
      const stockTake = await tx.stockTake.findFirst({
        where: { id: stockTakeId, companyId },
        include: { items: true },
      });
      if (!stockTake) throw new Error("الجرد غير موجود");
      if (stockTake.status !== "DRAFT") throw new Error("لا يمكن اعتماد جرد إلا من حالة مسودة");

      const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } });
      const now = new Date();
      const countByItemId = new Map(counts.map((c) => [c.stockTakeItemId, c.actualQty]));

      let adjustedCount = 0;

      for (const line of stockTake.items) {
        const actualQty = new D(countByItemId.get(line.id) ?? line.actualQty);
        const bookQty = new D(line.bookQty);

        await tx.stockTakeItem.update({ where: { id: line.id }, data: { actualQty } });

        const diff = actualQty.minus(bookQty);
        if (diff.isZero()) continue;

        if (diff.greaterThan(0)) {
          // موجود فعليًا أكثر من الدفتري — يُقيَّم بمتوسط التكلفة الحالي (لا تكلفة "شراء" معروفة لفرق الجرد)
          const balance = await tx.stockBalance.findUnique({
            where: { companyId_itemId_warehouseId: { companyId, itemId: line.itemId, warehouseId: stockTake.warehouseId } },
          });
          const currentAvgCost = balance ? new D(balance.avgCost) : new D(line.unitCost);
          await recordStockMovement(tx, {
            companyId,
            itemId: line.itemId,
            warehouseId: stockTake.warehouseId,
            movementDate: now,
            movementType: "STOCK_ADJUSTMENT_IN",
            documentType: "stock_take",
            documentId: stockTake.id,
            documentNo: stockTake.docNo,
            userId,
            allowNegativeStock: company.allowNegativeStock,
            qtyIn: diff,
            unitCost: currentAvgCost,
          });
        } else {
          await recordStockMovement(tx, {
            companyId,
            itemId: line.itemId,
            warehouseId: stockTake.warehouseId,
            movementDate: now,
            movementType: "STOCK_ADJUSTMENT_OUT",
            documentType: "stock_take",
            documentId: stockTake.id,
            documentNo: stockTake.docNo,
            userId,
            allowNegativeStock: company.allowNegativeStock,
            qtyOut: diff.abs(),
          });
        }
        adjustedCount++;
      }

      await tx.stockTake.update({
        where: { id: stockTake.id },
        data: { status: "POSTED", postedAt: now },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId,
          action: "approve",
          module: "stock_take",
          tableName: "stock_takes",
          recordId: stockTake.id,
          newValue: { status: "POSTED", adjustedLines: adjustedCount },
        },
      });

      return { adjustedCount };
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
