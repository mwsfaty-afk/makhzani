import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordStockMovement } from "@/lib/services/inventory/stockMovement";
import { assertSubscriptionActive } from "@/lib/services/billing/subscriptionGuard";

const D = Prisma.Decimal;

/**
 * اعتماد فاتورة شراء (بند 20، docs/ARCHITECTURE.md §6): من Draft لا يوجد أي أثر، عند
 * الاعتماد تُنفَّذ كل الخطوات معًا ضمن Transaction واحدة — حركة مخزون لكل سطر، قيد مورد،
 * وقيد خزينة إن وُجد سداد وقت الشراء. لا تعديل جزئي ممكن.
 */
export async function postPurchase(companyId: number, purchaseId: number, userId: number) {
  await assertSubscriptionActive(companyId);
  return prisma.$transaction(
    async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id: purchaseId, companyId },
        include: { items: true },
      });
      if (!purchase) throw new Error("الفاتورة غير موجودة");
      if (purchase.status !== "DRAFT") throw new Error("لا يمكن اعتماد فاتورة إلا من حالة مسودة");

      const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } });

      // جلب كل الأصناف المطلوبة دفعة واحدة بدل استعلام منفصل لكل سطر — الحلقة نفسها
      // (recordStockMovement) لازم تبقى متسلسلة لأنها تقفل صف الرصيد لكل صنف (FOR UPDATE)،
      // لكن لا داعي أن يتكرر معها استعلام قراءة الصنف الذي لا يعتمد على نتيجة أي سطر آخر.
      const itemsById = new Map(
        (await tx.item.findMany({ where: { id: { in: purchase.items.map((l) => l.itemId) } } })).map((i) => [i.id, i]),
      );

      // qty على سطر الفاتورة مُدخلة بوحدة الشراء المختارة (مثلاً "كرتونة") كما تظهر في
      // فاتورة حقيقية — لازم تحويلها لوحدة الصنف الأساسية قبل تسجيلها في محرك المخزون.
      for (const line of purchase.items) {
        const item = itemsById.get(line.itemId)!;
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
          movementDate: purchase.date,
          movementType: "PURCHASE",
          documentType: "purchase",
          documentId: purchase.id,
          documentNo: purchase.docNo,
          userId,
          allowNegativeStock: company.allowNegativeStock,
          qtyIn: baseQty,
          unitCost: line.costPerBaseUnit,
        });
      }

      const lastTxn = await tx.supplierTransaction.findFirst({
        where: { companyId, supplierId: purchase.supplierId },
        orderBy: { id: "desc" },
      });
      const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: purchase.supplierId } });
      let running = lastTxn ? new D(lastTxn.balanceAfter) : new D(supplier.openingBalance);

      running = running.plus(purchase.grandTotal);
      await tx.supplierTransaction.create({
        data: {
          companyId,
          supplierId: purchase.supplierId,
          type: "purchase",
          documentType: "purchase",
          documentId: purchase.id,
          debit: 0,
          credit: purchase.grandTotal,
          balanceAfter: running,
          date: purchase.date,
        },
      });

      if (new D(purchase.paidAmount).greaterThan(0)) {
        running = running.minus(purchase.paidAmount);
        await tx.supplierTransaction.create({
          data: {
            companyId,
            supplierId: purchase.supplierId,
            type: "payment",
            documentType: "purchase",
            documentId: purchase.id,
            debit: purchase.paidAmount,
            credit: 0,
            balanceAfter: running,
            date: purchase.date,
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
              direction: "OUT",
              date: purchase.date,
              documentType: "purchase",
              documentId: purchase.id,
              relatedSupplierId: purchase.supplierId,
              userId,
            },
          });
        }
      }

      await tx.purchase.update({
        where: { id: purchase.id },
        data: { status: "POSTED", postedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId,
          action: "approve",
          module: "purchases",
          tableName: "purchases",
          recordId: purchase.id,
          newValue: { status: "POSTED", grandTotal: purchase.grandTotal.toString() },
        },
      });
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
