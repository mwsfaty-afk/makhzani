import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordStockMovement } from "@/lib/services/inventory/stockMovement";
import { assertSubscriptionActive } from "@/lib/services/billing/subscriptionGuard";

const D = Prisma.Decimal;

/**
 * إلغاء فاتورة بيع معتمدة (بند 41): عكس كامل، بدون حذف. على عكس إلغاء الشراء، عكس فاتورة
 * بيع هو حركة IN عادية بنفس تكلفة البيع المسجَّلة على السطر — إعادة كمية بنفس التكلفة التي
 * خرجت بها لا يغيّر المتوسط المرجّح رياضيًا (بخلاف عكس فاتورة شراء الذي يحتاج معادلة خاصة).
 */
export async function cancelSale(companyId: number, saleId: number, userId: number) {
  await assertSubscriptionActive(companyId);
  return prisma.$transaction(
    async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, companyId },
        include: { items: true },
      });
      if (!sale) throw new Error("الفاتورة غير موجودة");
      if (sale.status !== "POSTED") throw new Error("لا يمكن إلغاء إلا فاتورة معتمدة");

      const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } });
      const now = new Date();

      for (const line of sale.items) {
        const item = await tx.item.findUniqueOrThrow({ where: { id: line.itemId } });
        const factor =
          line.unitId === item.salesUnitId
            ? new D(item.salesUnitFactor)
            : line.unitId === item.purchaseUnitId
              ? new D(item.purchaseUnitFactor)
              : new D(1);
        const baseQty = new D(line.qty).times(factor);

        await recordStockMovement(tx, {
          companyId,
          itemId: line.itemId,
          warehouseId: sale.warehouseId,
          movementDate: now,
          movementType: "SALE",
          documentType: "sale",
          documentId: sale.id,
          documentNo: sale.docNo,
          userId,
          allowNegativeStock: company.allowNegativeStock,
          qtyIn: baseQty,
          unitCost: line.costPerBaseUnit,
        });
      }

      const lastTxn = await tx.customerTransaction.findFirst({
        where: { companyId, customerId: sale.customerId },
        orderBy: { id: "desc" },
      });
      let running = lastTxn ? new D(lastTxn.balanceAfter) : new D(0);

      running = running.minus(sale.grandTotal);
      await tx.customerTransaction.create({
        data: {
          companyId,
          customerId: sale.customerId,
          type: "sale_cancel",
          documentType: "sale",
          documentId: sale.id,
          debit: 0,
          credit: sale.grandTotal,
          balanceAfter: running,
          date: now,
        },
      });

      if (new D(sale.paidAmount).greaterThan(0)) {
        running = running.plus(sale.paidAmount);
        await tx.customerTransaction.create({
          data: {
            companyId,
            customerId: sale.customerId,
            type: "collection_reversal",
            documentType: "sale",
            documentId: sale.id,
            debit: sale.paidAmount,
            credit: 0,
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
              type: "CUSTOMER_COLLECTION",
              amount: sale.paidAmount,
              direction: "OUT",
              date: now,
              documentType: "sale",
              documentId: sale.id,
              relatedCustomerId: sale.customerId,
              userId,
              notes: "استرداد بسبب إلغاء الفاتورة",
            },
          });
        }
      }

      await tx.sale.update({
        where: { id: sale.id },
        data: { status: "CANCELLED", cancelledAt: now },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId,
          action: "cancel",
          module: "sales",
          tableName: "sales",
          recordId: sale.id,
          newValue: { status: "CANCELLED" },
        },
      });
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
