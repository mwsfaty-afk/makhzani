import { prisma } from "@/lib/db/prisma";
import { recordStockMovement } from "@/lib/services/inventory/stockMovement";
import { nextDocumentNumber } from "@/lib/services/documentNumbering";
import { assertSubscriptionActive } from "@/lib/services/billing/subscriptionGuard";

export type CreateStockTransferLine = { itemId: number; qty: number };

/**
 * تحويل مخزني بين مخزنين (بند 27): يُنشأ ويُعتمد في خطوة واحدة. كل سطر يُنتج حركتين
 * مرتبطتين — TRANSFER_OUT من المصدر (بمتوسط تكلفته الحالي)، ثم TRANSFER_IN للوجهة بنفس
 * التكلفة بالضبط (لا تُنشأ قيمة أو تُفقد عبر التحويل، وتُدمج في متوسط الوجهة بشكل صحيح).
 * ممنوع تمامًا التحويل لنفس المخزن — تحقق إلزامي في الـ Backend، ليس فقط الواجهة.
 */
export async function createStockTransfer(input: {
  companyId: number;
  userId: number;
  fromWarehouseId: number;
  toWarehouseId: number;
  notes?: string;
  lines: CreateStockTransferLine[];
}) {
  await assertSubscriptionActive(input.companyId);
  if (input.fromWarehouseId === input.toWarehouseId) {
    throw new Error("لا يمكن التحويل من وإلى نفس المخزن");
  }
  const validLines = input.lines.filter((l) => l.qty > 0);
  if (validLines.length === 0) {
    throw new Error("يجب إضافة صنف واحد على الأقل بكمية صحيحة");
  }

  return prisma.$transaction(
    async (tx) => {
      const company = await tx.company.findUniqueOrThrow({ where: { id: input.companyId } });
      const docNo = await nextDocumentNumber(tx, input.companyId, "transfer");
      const now = new Date();

      const transfer = await tx.stockTransfer.create({
        data: {
          companyId: input.companyId,
          docNo,
          date: now,
          fromWarehouseId: input.fromWarehouseId,
          toWarehouseId: input.toWarehouseId,
          status: "POSTED",
          notes: input.notes,
          userId: input.userId,
          postedAt: now,
          items: {
            create: validLines.map((l) => ({ itemId: l.itemId, qty: l.qty, unitCost: 0 })),
          },
        } as never,
      });

      for (const line of validLines) {
        const { movement: outMovement } = await recordStockMovement(tx, {
          companyId: input.companyId,
          itemId: line.itemId,
          warehouseId: input.fromWarehouseId,
          movementDate: now,
          movementType: "TRANSFER_OUT",
          documentType: "transfer",
          documentId: transfer.id,
          documentNo: docNo,
          userId: input.userId,
          allowNegativeStock: company.allowNegativeStock,
          qtyOut: line.qty,
        });

        await recordStockMovement(tx, {
          companyId: input.companyId,
          itemId: line.itemId,
          warehouseId: input.toWarehouseId,
          movementDate: now,
          movementType: "TRANSFER_IN",
          documentType: "transfer",
          documentId: transfer.id,
          documentNo: docNo,
          userId: input.userId,
          allowNegativeStock: company.allowNegativeStock,
          qtyIn: line.qty,
          unitCost: outMovement.unitCost,
        });

        await tx.stockTransferItem.updateMany({
          where: { stockTransferId: transfer.id, itemId: line.itemId },
          data: { unitCost: outMovement.unitCost },
        });
      }

      await tx.auditLog.create({
        data: {
          companyId: input.companyId,
          userId: input.userId,
          action: "create",
          module: "stock_transfers",
          tableName: "stock_transfers",
          recordId: transfer.id,
          newValue: { docNo, fromWarehouseId: input.fromWarehouseId, toWarehouseId: input.toWarehouseId },
        },
      });

      return transfer;
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
