import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordStockMovement } from "@/lib/services/inventory/stockMovement";

const D = Prisma.Decimal;

/**
 * إلغاء فاتورة شراء معتمدة (بند 41): لا حذف — تُنشأ حركات عكسية تُلغي الأثر بالكامل مع
 * بقاء المستند الأصلي وتاريخه ظاهرًا للأبد.
 */
export async function cancelPurchase(companyId: number, purchaseId: number, userId: number) {
  return prisma.$transaction(
    async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id: purchaseId, companyId },
        include: { items: true },
      });
      if (!purchase) throw new Error("الفاتورة غير موجودة");
      if (purchase.status !== "POSTED") throw new Error("لا يمكن إلغاء إلا فاتورة معتمدة");

      const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } });
      const now = new Date();

      for (const line of purchase.items) {
        const item = await tx.item.findUniqueOrThrow({ where: { id: line.itemId } });
        const factor =
          line.unitId === item.purchaseUnitId
            ? new D(item.purchaseUnitFactor)
            : line.unitId === item.salesUnitId
              ? new D(item.salesUnitFactor)
              : new D(1);
        const baseQty = new D(line.qty).times(factor);

        await recordStockMovement(tx, {
          companyId,
          itemId: line.itemId,
          warehouseId: purchase.warehouseId,
          movementDate: now,
          movementType: "PURCHASE",
          documentType: "purchase",
          documentId: purchase.id,
          documentNo: purchase.docNo,
          userId,
          allowNegativeStock: company.allowNegativeStock,
          qtyOut: baseQty,
          reverseUnitCost: line.costPerBaseUnit,
          notes: "إلغاء فاتورة شراء",
        });
      }

      const lastTxn = await tx.supplierTransaction.findFirst({
        where: { companyId, supplierId: purchase.supplierId },
        orderBy: { id: "desc" },
      });
      let running = lastTxn ? new D(lastTxn.balanceAfter) : new D(0);

      running = running.minus(purchase.grandTotal);
      await tx.supplierTransaction.create({
        data: {
          companyId,
          supplierId: purchase.supplierId,
          type: "purchase_cancel",
          documentType: "purchase",
          documentId: purchase.id,
          debit: purchase.grandTotal,
          credit: 0,
          balanceAfter: running,
          date: now,
        },
      });

      if (new D(purchase.paidAmount).greaterThan(0)) {
        running = running.plus(purchase.paidAmount);
        await tx.supplierTransaction.create({
          data: {
            companyId,
            supplierId: purchase.supplierId,
            type: "payment_reversal",
            documentType: "purchase",
            documentId: purchase.id,
            debit: 0,
            credit: purchase.paidAmount,
            balanceAfter: running,
            date: now,
          },
        });

        const cashBox = await tx.cashBox.findFirst({ where: { companyId, isDefault: true } });
        if (cashBox) {
          await tx.cashTransaction.create({
            data: {
              companyId,
              cashBoxId: cashBox.id,
              type: "SUPPLIER_PAYMENT",
              amount: purchase.paidAmount,
              direction: "IN",
              date: now,
              documentType: "purchase",
              documentId: purchase.id,
              relatedSupplierId: purchase.supplierId,
              userId,
              notes: "استرداد بسبب إلغاء الفاتورة",
            },
          });
        }
      }

      await tx.purchase.update({
        where: { id: purchase.id },
        data: { status: "CANCELLED", cancelledAt: now },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId,
          action: "cancel",
          module: "purchases",
          tableName: "purchases",
          recordId: purchase.id,
          newValue: { status: "CANCELLED" },
        },
      });
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
