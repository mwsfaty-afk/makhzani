import { prisma } from "@/lib/db/prisma";
import { recordStockMovement } from "@/lib/services/inventory/stockMovement";
import { assertSubscriptionActive } from "@/lib/services/billing/subscriptionGuard";
import { movementTypeForAdjustment } from "@/lib/services/inventory/adjustmentReasons";

/**
 * اعتماد أمر توريد/صرف (نفس نمط postPurchase.ts): من Draft لا يوجد أي أثر على المخزون؛
 * عند الاعتماد تُسجَّل حركة مخزون واحدة لكل بند ضمن Transaction واحدة — لا تعديل جزئي ممكن.
 */
export async function postStockOrder(companyId: number, orderId: number, userId: number) {
  await assertSubscriptionActive(companyId);
  return prisma.$transaction(
    async (tx) => {
      const order = await tx.stockAdjustment.findFirst({
        where: { id: orderId, companyId },
        include: { items: true },
      });
      if (!order) throw new Error("الأمر غير موجود");
      if (order.status !== "DRAFT") throw new Error("لا يمكن اعتماد أمر إلا من حالة مسودة");

      const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } });
      const direction = order.direction as "IN" | "OUT";
      const movementType = movementTypeForAdjustment(direction, order.reason);

      for (const line of order.items) {
        await recordStockMovement(tx, {
          companyId,
          itemId: line.itemId,
          warehouseId: order.warehouseId,
          movementDate: order.date,
          movementType,
          documentType: direction === "IN" ? "stock_in" : "stock_out",
          documentId: order.id,
          documentNo: order.docNo,
          userId,
          notes: order.notes ?? undefined,
          allowNegativeStock: company.allowNegativeStock,
          expiryDate: direction === "IN" ? (line.expiryDate ?? undefined) : undefined,
          ...(direction === "IN" ? { qtyIn: line.qty, unitCost: line.unitCost } : { qtyOut: line.qty }),
        } as never);
      }

      await tx.stockAdjustment.update({
        where: { id: order.id },
        data: { status: "POSTED", postedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId,
          action: "approve",
          module: "stock",
          tableName: "stock_adjustments",
          recordId: order.id,
          newValue: { docNo: order.docNo, direction: order.direction, status: "POSTED" },
        },
      });
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
