import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordStockMovement, InsufficientStockError } from "@/lib/services/inventory/stockMovement";
import { assertSubscriptionActive } from "@/lib/services/billing/subscriptionGuard";

const D = Prisma.Decimal;

/**
 * اعتماد فاتورة بيع (بند 23-24، docs/ARCHITECTURE.md §6): تحقق من توفر المخزون (يفشل
 * الاعتماد بالكامل — Rollback — إن لم يكن مسموحًا بمخزون سالب)، ثم حركة مخزون صادرة لكل
 * سطر بمتوسط التكلفة الحالي (COGS)، ثم قيد عميل، ثم قيد خزينة إن وُجد تحصيل وقت البيع.
 * الربح يُحسب هنا فقط (وليس عند الإنشاء) لأنه يعتمد على التكلفة اللحظية وقت الاعتماد الفعلي.
 */
export async function postSale(companyId: number, saleId: number, userId: number) {
  await assertSubscriptionActive(companyId);
  return prisma.$transaction(
    async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, companyId },
        include: { items: true },
      });
      if (!sale) throw new Error("الفاتورة غير موجودة");
      if (sale.status !== "DRAFT") throw new Error("لا يمكن اعتماد فاتورة إلا من حالة مسودة");

      const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } });

      let totalCost = new D(0);
      let totalProfit = new D(0);

      for (const line of sale.items) {
        const item = await tx.item.findUniqueOrThrow({ where: { id: line.itemId } });
        const factor =
          line.unitId === item.salesUnitId
            ? new D(item.salesUnitFactor)
            : line.unitId === item.purchaseUnitId
              ? new D(item.purchaseUnitFactor)
              : new D(1);
        const baseQty = new D(line.qty).times(factor);

        const { movement } = await recordStockMovement(tx, {
          companyId,
          itemId: line.itemId,
          warehouseId: sale.warehouseId,
          movementDate: sale.date,
          movementType: "SALE",
          documentType: "sale",
          documentId: sale.id,
          documentNo: sale.docNo,
          userId,
          allowNegativeStock: company.allowNegativeStock,
          qtyOut: baseQty,
        });

        const lineCostPerBaseUnit = new D(movement.unitCost);
        const lineCostTotal = new D(movement.totalCost);
        // الربح على أساس الإيراد بعد الخصم وقبل الضريبة (الضريبة ليست جزءًا من هامش الربح)
        const lineRevenue = new D(line.total).minus(line.tax);
        const lineProfit = lineRevenue.minus(lineCostTotal);

        await tx.saleItem.update({
          where: { id: line.id },
          data: { costPerBaseUnit: lineCostPerBaseUnit, totalCost: lineCostTotal, profit: lineProfit },
        });

        totalCost = totalCost.plus(lineCostTotal);
        totalProfit = totalProfit.plus(lineProfit);
      }

      const lastTxn = await tx.customerTransaction.findFirst({
        where: { companyId, customerId: sale.customerId },
        orderBy: { id: "desc" },
      });
      const customer = await tx.customer.findUniqueOrThrow({ where: { id: sale.customerId } });
      let running = lastTxn ? new D(lastTxn.balanceAfter) : new D(customer.openingBalance);

      running = running.plus(sale.grandTotal);
      await tx.customerTransaction.create({
        data: {
          companyId,
          customerId: sale.customerId,
          type: "sale",
          documentType: "sale",
          documentId: sale.id,
          debit: sale.grandTotal,
          credit: 0,
          balanceAfter: running,
          date: sale.date,
        },
      });

      if (new D(sale.paidAmount).greaterThan(0)) {
        running = running.minus(sale.paidAmount);
        await tx.customerTransaction.create({
          data: {
            companyId,
            customerId: sale.customerId,
            type: "collection",
            documentType: "sale",
            documentId: sale.id,
            debit: 0,
            credit: sale.paidAmount,
            balanceAfter: running,
            date: sale.date,
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
              direction: "IN",
              date: sale.date,
              documentType: "sale",
              documentId: sale.id,
              relatedCustomerId: sale.customerId,
              userId,
            },
          });
        }
      }

      await tx.sale.update({
        where: { id: sale.id },
        data: { status: "POSTED", postedAt: new Date(), totalCost, totalProfit },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId,
          action: "approve",
          module: "sales",
          tableName: "sales",
          recordId: sale.id,
          newValue: { status: "POSTED", grandTotal: sale.grandTotal.toString(), totalProfit: totalProfit.toString() },
        },
      });
    },
    { timeout: 20000, maxWait: 10000 },
  );
}

export { InsufficientStockError };
