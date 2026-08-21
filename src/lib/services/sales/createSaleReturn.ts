import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordStockMovement } from "@/lib/services/inventory/stockMovement";
import { nextDocumentNumber } from "@/lib/services/documentNumbering";

const D = Prisma.Decimal;

export type CreateSaleReturnLine = { saleItemId: number; qty: number };

/**
 * مرتجع مبيعات (بند 25): يُنشأ ويُعتمد في خطوة واحدة. البضاعة تعود للمخزون بنفس التكلفة
 * المسجَّلة على سطر البيع الأصلي وقت بيعه (costPerBaseUnit) — وليس بمتوسط التكلفة الحالي —
 * حتى يكون تخفيض الربح دقيقًا: نفس القيمة بالضبط التي خرجت بها هذه الوحدات، لا أكثر ولا أقل.
 */
export async function createSaleReturn(input: {
  companyId: number;
  userId: number;
  saleId: number;
  reason?: string;
  refundMethod: "cash" | "customer_credit";
  lines: CreateSaleReturnLine[];
}) {
  return prisma.$transaction(
    async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: input.saleId, companyId: input.companyId },
        include: { items: true },
      });
      if (!sale) throw new Error("فاتورة البيع غير موجودة");
      if (sale.status !== "POSTED") throw new Error("لا يمكن الإرجاع إلا لفاتورة معتمدة");

      const company = await tx.company.findUniqueOrThrow({ where: { id: input.companyId } });
      const docNo = await nextDocumentNumber(tx, input.companyId, "sale_return");
      const now = new Date();

      let totalAmount = new D(0);
      const rows: { saleItemId: number; itemId: number; qty: InstanceType<typeof D>; unitPrice: InstanceType<typeof D>; total: InstanceType<typeof D> }[] = [];

      for (const line of input.lines) {
        if (line.qty <= 0) continue;
        const original = sale.items.find((i) => i.id === line.saleItemId);
        if (!original) throw new Error("سطر غير صحيح في فاتورة البيع الأصلية");
        const qty = new D(line.qty);
        if (qty.greaterThan(original.qty)) {
          throw new Error("الكمية المرتجعة أكبر من الكمية المباعة في هذا السطر");
        }
        const total = qty.times(original.unitPrice);
        totalAmount = totalAmount.plus(total);
        rows.push({ saleItemId: original.id, itemId: original.itemId, qty, unitPrice: original.unitPrice, total });
      }
      if (rows.length === 0) throw new Error("أدخل كمية إرجاع صحيحة لصنف واحد على الأقل");

      const saleReturn = await tx.saleReturn.create({
        data: {
          companyId: input.companyId,
          docNo,
          date: now,
          saleId: sale.id,
          reason: input.reason,
          refundMethod: input.refundMethod,
          status: "POSTED",
          userId: input.userId,
          postedAt: now,
          items: { create: rows },
        } as never,
      });

      for (const row of rows) {
        const original = sale.items.find((i) => i.id === row.saleItemId)!;
        const item = await tx.item.findUniqueOrThrow({ where: { id: row.itemId } });
        const factor =
          original.unitId === item.salesUnitId
            ? new D(item.salesUnitFactor)
            : original.unitId === item.purchaseUnitId
              ? new D(item.purchaseUnitFactor)
              : new D(1);
        const baseQty = row.qty.times(factor);

        await recordStockMovement(tx, {
          companyId: input.companyId,
          itemId: row.itemId,
          warehouseId: sale.warehouseId,
          movementDate: now,
          movementType: "SALE_RETURN",
          documentType: "sale_return",
          documentId: saleReturn.id,
          documentNo: docNo,
          userId: input.userId,
          allowNegativeStock: company.allowNegativeStock,
          qtyIn: baseQty,
          unitCost: original.costPerBaseUnit,
        });
      }

      const lastTxn = await tx.customerTransaction.findFirst({
        where: { companyId: input.companyId, customerId: sale.customerId },
        orderBy: { id: "desc" },
      });
      const customer = await tx.customer.findUniqueOrThrow({ where: { id: sale.customerId } });
      let running = (lastTxn ? new D(lastTxn.balanceAfter) : new D(customer.openingBalance)).minus(totalAmount);

      await tx.customerTransaction.create({
        data: {
          companyId: input.companyId,
          customerId: sale.customerId,
          type: "sale_return",
          documentType: "sale_return",
          documentId: saleReturn.id,
          debit: 0,
          credit: totalAmount,
          balanceAfter: running,
          date: now,
        },
      });

      if (input.refundMethod === "cash") {
        running = running.plus(totalAmount);
        await tx.customerTransaction.create({
          data: {
            companyId: input.companyId,
            customerId: sale.customerId,
            type: "refund",
            documentType: "sale_return",
            documentId: saleReturn.id,
            debit: totalAmount,
            credit: 0,
            balanceAfter: running,
            date: now,
          },
        });

        const cashBox = await tx.cashBox.findFirst({ where: { companyId: input.companyId, isDefault: true } });
        if (cashBox) {
          await tx.cashTransaction.create({
            data: {
              companyId: input.companyId,
              cashBoxId: cashBox.id,
              type: "PAYMENT",
              amount: totalAmount,
              direction: "OUT",
              date: now,
              documentType: "sale_return",
              documentId: saleReturn.id,
              relatedCustomerId: sale.customerId,
              userId: input.userId,
              notes: "استرداد نقدي لمرتجع بيع",
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          companyId: input.companyId,
          userId: input.userId,
          action: "create",
          module: "sale_returns",
          tableName: "sale_returns",
          recordId: saleReturn.id,
          newValue: { docNo, saleId: sale.id, totalAmount: totalAmount.toString(), refundMethod: input.refundMethod },
        },
      });

      return saleReturn;
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
