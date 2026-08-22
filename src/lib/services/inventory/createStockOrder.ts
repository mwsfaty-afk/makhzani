import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { nextDocumentNumber } from "@/lib/services/documentNumbering";
import { assertSubscriptionActive } from "@/lib/services/billing/subscriptionGuard";
import { IN_REASONS, OUT_REASONS } from "@/lib/services/inventory/adjustmentReasons";

const D = Prisma.Decimal;

export type CreateStockOrderLine = {
  itemId: number;
  qty: number;
  /** إلزامي عند direction=IN فقط (تكلفة الوحدة بالوحدة الأساسية للصنف). */
  unitCost?: number;
  /** تنبيه فقط — راجع ملاحظة الحقل في schema.prisma. ذو معنى فقط عند direction=IN. */
  expiryDate?: Date;
};

export type CreateStockOrderInput = {
  companyId: number;
  warehouseId: number;
  direction: "IN" | "OUT";
  reason: string;
  date: Date;
  notes?: string;
  userId: number;
  lines: CreateStockOrderLine[];
};

/**
 * إنشاء "أمر توريد/صرف" كمسودة فقط (بلا أي أثر على المخزون) — يُعاد استخدام جدولَي
 * StockAdjustment/StockAdjustmentItem الموجودين فعلاً (نفس بنية أمر الشراء: الإنشاء
 * منفصل تمامًا عن الاعتماد؛ راجع createPurchase.ts للنمط المطابق).
 */
export async function createStockOrder(input: CreateStockOrderInput) {
  await assertSubscriptionActive(input.companyId);
  if (input.lines.length === 0) throw new Error("يجب إضافة صنف واحد على الأقل");

  const validReasons = input.direction === "IN" ? IN_REASONS : OUT_REASONS;
  if (!validReasons.includes(input.reason as never)) throw new Error("سبب غير صحيح");

  if (input.direction === "IN" && input.lines.some((l) => l.unitCost === undefined)) {
    throw new Error("تكلفة الوحدة مطلوبة لكل الأصناف عند التوريد");
  }

  const items = await prisma.item.findMany({
    where: { id: { in: input.lines.map((l) => l.itemId) }, companyId: input.companyId },
  });
  const itemIds = new Set(items.map((i) => i.id));
  for (const line of input.lines) {
    if (!itemIds.has(line.itemId)) throw new Error("صنف غير صحيح");
    if (line.qty <= 0) throw new Error("الكمية يجب أن تكون أكبر من صفر");
  }

  const docType = input.direction === "IN" ? "stock_in" : "stock_out";

  return prisma.$transaction(async (tx) => {
    const docNo = await nextDocumentNumber(tx, input.companyId, docType);

    const order = await tx.stockAdjustment.create({
      data: {
        companyId: input.companyId,
        docNo,
        date: input.date,
        warehouseId: input.warehouseId,
        reason: input.reason,
        direction: input.direction,
        notes: input.notes,
        status: "DRAFT",
        userId: input.userId,
        items: {
          create: input.lines.map((line) => ({
            itemId: line.itemId,
            qty: new D(line.qty),
            unitCost: input.direction === "IN" ? new D(line.unitCost!) : new D(0),
            expiryDate: input.direction === "IN" ? line.expiryDate : undefined,
          })),
        },
      } as never,
    });

    return order;
  });
}
