import { Prisma, MovementType } from "@prisma/client";
import type { Prisma as PrismaNS } from "@prisma/client";

type Tx = PrismaNS.TransactionClient;

const D = Prisma.Decimal;
type Decimal = InstanceType<typeof D>;

export class InsufficientStockError extends Error {
  constructor(available: Decimal, requested: Decimal) {
    super(`الكمية المتاحة (${available.toString()}) أقل من الكمية المطلوبة (${requested.toString()})`);
    this.name = "InsufficientStockError";
  }
}

export type RecordStockMovementInput = {
  companyId: number;
  itemId: number;
  warehouseId: number;
  movementDate: Date;
  movementType: MovementType;
  documentType: string;
  documentNo: string;
  documentId: number;
  userId: number;
  notes?: string;
  allowNegativeStock: boolean;
  /** تاريخ صلاحية اختياري — تنبيه فقط، لا يُستخدَم لأي منطق حساب هنا (راجع ملاحظة
   * الحقل في schema.prisma). ذو معنى فقط لحركات IN. */
  expiryDate?: Date;
} & (
  | { qtyIn: number | string | Decimal; unitCost: number | string | Decimal; qtyOut?: never; reverseUnitCost?: never }
  | { qtyOut: number | string | Decimal; qtyIn?: never; unitCost?: never; reverseUnitCost?: number | string | Decimal }
);

/**
 * القلب المركزي لكل حركة مخزون في النظام (docs/ARCHITECTURE.md §5). يجب أن تمر كل عملية
 * تزيد أو تُنقص المخزون من هنا — لا يوجد أي مسار آخر لتعديل stock_balances مباشرة.
 *
 * يُستدعى دائمًا من داخل `prisma.$transaction(...)` قائم بالفعل (المستند + الحركة + القيود
 * المالية المرتبطة تُنشأ كلها معًا أو لا شيء منها، بند 64).
 *
 * ملاحظة عن التزامن: نستخدم `SELECT ... FOR UPDATE` لقفل صف الرصيد الحالي أثناء الحساب لمنع
 * Race Condition عند حركتين متزامنتين لنفس الصنف/المخزن. أول حركة على الإطلاق لصنف في مخزن
 * (لا يوجد صف StockBalance بعد) نافذة تزامن ضئيلة جدًا مقبولة في هذه المرحلة — تُعالَج لاحقًا
 * إن دعت الحاجة الفعلية (حجم استخدام عالٍ متزامن على نفس الصنف الجديد لحظة إنشائه).
 */
export async function recordStockMovement(tx: Tx, input: RecordStockMovementInput) {
  const locked = await tx.$queryRaw<{ id: number; qty: Decimal; avgCost: Decimal }[]>(Prisma.sql`
    SELECT id, qty, "avgCost" FROM "StockBalance"
    WHERE "companyId" = ${input.companyId} AND "itemId" = ${input.itemId} AND "warehouseId" = ${input.warehouseId}
    FOR UPDATE
  `);

  const existingQty = locked[0] ? new D(locked[0].qty) : new D(0);
  const existingAvgCost = locked[0] ? new D(locked[0].avgCost) : new D(0);

  let newQty: Decimal;
  let newAvgCost: Decimal;
  let movementUnitCost: Decimal;
  let qtyIn = new D(0);
  let qtyOut = new D(0);

  if (input.qtyIn !== undefined) {
    qtyIn = new D(input.qtyIn);
    const unitCost = new D(input.unitCost);
    newQty = existingQty.plus(qtyIn);
    const oldValue = existingQty.times(existingAvgCost);
    const addedValue = qtyIn.times(unitCost);
    newAvgCost = newQty.isZero() ? new D(0) : oldValue.plus(addedValue).div(newQty);
    movementUnitCost = unitCost;
  } else {
    qtyOut = new D(input.qtyOut);
    newQty = existingQty.minus(qtyOut);
    if (!input.allowNegativeStock && newQty.isNegative()) {
      throw new InsufficientStockError(existingQty, qtyOut);
    }
    if (input.reverseUnitCost !== undefined) {
      // إلغاء حركة IN سابقة (مثل إلغاء فاتورة شراء) ليس بيعًا عاديًا — لازم "فك" أثرها على
      // المتوسط المرجّح جبريًا، وإلا يبقى المتوسط ملوّثًا بتكلفة فاتورة أُلغيت بالكامل.
      const reverseCost = new D(input.reverseUnitCost);
      const oldValue = existingQty.times(existingAvgCost);
      const removedValue = qtyOut.times(reverseCost);
      newAvgCost = newQty.isZero() ? new D(0) : oldValue.minus(removedValue).div(newQty);
      movementUnitCost = reverseCost;
    } else {
      newAvgCost = existingAvgCost;
      movementUnitCost = existingAvgCost;
    }
  }

  const totalCost = qtyIn.greaterThan(0) ? qtyIn.times(movementUnitCost) : qtyOut.times(movementUnitCost);

  const balance = await tx.stockBalance.upsert({
    where: { companyId_itemId_warehouseId: { companyId: input.companyId, itemId: input.itemId, warehouseId: input.warehouseId } },
    create: { companyId: input.companyId, itemId: input.itemId, warehouseId: input.warehouseId, qty: newQty, avgCost: newAvgCost },
    update: { qty: newQty, avgCost: newAvgCost },
  });

  const movement = await tx.stockMovement.create({
    data: {
      companyId: input.companyId,
      itemId: input.itemId,
      warehouseId: input.warehouseId,
      movementDate: input.movementDate,
      movementType: input.movementType,
      documentType: input.documentType,
      documentId: input.documentId,
      documentNo: input.documentNo,
      qtyIn,
      qtyOut,
      unitCost: movementUnitCost,
      totalCost,
      balanceAfter: newQty,
      userId: input.userId,
      notes: input.notes,
      expiryDate: input.expiryDate,
    } as never,
  });

  return { movement, balance };
}
