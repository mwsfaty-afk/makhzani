import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordStockMovement } from "@/lib/services/inventory/stockMovement";
import { nextDocumentNumber } from "@/lib/services/documentNumbering";
import { assertSubscriptionActive } from "@/lib/services/billing/subscriptionGuard";

const D = Prisma.Decimal;

export type CreatePurchaseReturnLine = { purchaseItemId: number; qty: number };

/**
 * مرتجع مشتريات (بند 21): يُنشأ ويُعتمد في خطوة واحدة (بخلاف الفاتورة الأصلية التي تمر
 * بمسودة). هذا **ليس** إلغاءً لفاتورة الشراء — حدث تجاري جديد يخصم من المخزون بمتوسط
 * التكلفة **الحالي** (وليس تكلفة الشراء الأصلية)، لأن الرصيد ربما تغيّر منذ ذلك الحين
 * بعمليات أخرى؛ لذلك تُستخدم حركة OUT عادية هنا وليس reverseUnitCost (تلك خاصة بإلغاء
 * فاتورة بأكملها فقط — راجع docs الخاصة بـ recordStockMovement).
 */
export async function createPurchaseReturn(input: {
  companyId: number;
  userId: number;
  purchaseId: number;
  reason?: string;
  lines: CreatePurchaseReturnLine[];
}) {
  await assertSubscriptionActive(input.companyId);
  return prisma.$transaction(
    async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id: input.purchaseId, companyId: input.companyId },
        include: { items: true },
      });
      if (!purchase) throw new Error("فاتورة الشراء غير موجودة");
      if (purchase.status !== "POSTED") throw new Error("لا يمكن الإرجاع إلا لفاتورة معتمدة");

      const company = await tx.company.findUniqueOrThrow({ where: { id: input.companyId } });
      const docNo = await nextDocumentNumber(tx, input.companyId, "purchase_return");
      const now = new Date();

      let totalAmount = new D(0);
      const rows: { purchaseItemId: number; itemId: number; qty: InstanceType<typeof D>; unitPrice: InstanceType<typeof D>; total: InstanceType<typeof D> }[] = [];

      for (const line of input.lines) {
        if (line.qty <= 0) continue;
        const original = purchase.items.find((i) => i.id === line.purchaseItemId);
        if (!original) throw new Error("سطر غير صحيح في فاتورة الشراء الأصلية");
        const qty = new D(line.qty);
        if (qty.greaterThan(original.qty)) {
          throw new Error("الكمية المرتجعة أكبر من الكمية المشتراة في هذا السطر");
        }
        const total = qty.times(original.unitPrice);
        totalAmount = totalAmount.plus(total);
        rows.push({ purchaseItemId: original.id, itemId: original.itemId, qty, unitPrice: original.unitPrice, total });
      }
      if (rows.length === 0) throw new Error("أدخل كمية إرجاع صحيحة لصنف واحد على الأقل");

      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          companyId: input.companyId,
          docNo,
          date: now,
          purchaseId: purchase.id,
          reason: input.reason,
          status: "POSTED",
          userId: input.userId,
          postedAt: now,
          items: { create: rows },
        } as never,
      });

      for (const row of rows) {
        const original = purchase.items.find((i) => i.id === row.purchaseItemId)!;
        const item = await tx.item.findUniqueOrThrow({ where: { id: row.itemId } });
        const factor =
          original.unitId === item.purchaseUnitId
            ? new D(item.purchaseUnitFactor)
            : original.unitId === item.salesUnitId
              ? new D(item.salesUnitFactor)
              : new D(1);
        const baseQty = row.qty.times(factor);

        await recordStockMovement(tx, {
          companyId: input.companyId,
          itemId: row.itemId,
          warehouseId: purchase.warehouseId,
          movementDate: now,
          movementType: "PURCHASE_RETURN",
          documentType: "purchase_return",
          documentId: purchaseReturn.id,
          documentNo: docNo,
          userId: input.userId,
          allowNegativeStock: company.allowNegativeStock,
          qtyOut: baseQty,
        });
      }

      const lastTxn = await tx.supplierTransaction.findFirst({
        where: { companyId: input.companyId, supplierId: purchase.supplierId },
        orderBy: { id: "desc" },
      });
      const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: purchase.supplierId } });
      const running = (lastTxn ? new D(lastTxn.balanceAfter) : new D(supplier.openingBalance)).minus(totalAmount);

      await tx.supplierTransaction.create({
        data: {
          companyId: input.companyId,
          supplierId: purchase.supplierId,
          type: "purchase_return",
          documentType: "purchase_return",
          documentId: purchaseReturn.id,
          debit: totalAmount,
          credit: 0,
          balanceAfter: running,
          date: now,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: input.companyId,
          userId: input.userId,
          action: "create",
          module: "purchase_returns",
          tableName: "purchase_returns",
          recordId: purchaseReturn.id,
          newValue: { docNo, purchaseId: purchase.id, totalAmount: totalAmount.toString() },
        },
      });

      return purchaseReturn;
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
