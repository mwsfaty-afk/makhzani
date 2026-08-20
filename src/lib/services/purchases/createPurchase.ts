import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { nextDocumentNumber } from "@/lib/services/documentNumbering";

const D = Prisma.Decimal;

export type CreatePurchaseLine = {
  itemId: number;
  unitId: number;
  qty: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number; // نسبة % يُدخلها المستخدم — يُحسَب منها مبلغ الضريبة عند الحفظ
};

export type CreatePurchaseInput = {
  companyId: number;
  supplierId: number;
  warehouseId: number;
  date: Date;
  paymentMethod?: string;
  paidAmount?: number;
  notes?: string;
  userId: number;
  lines: CreatePurchaseLine[];
};

export async function createPurchase(input: CreatePurchaseInput) {
  if (input.lines.length === 0) throw new Error("يجب إضافة صنف واحد على الأقل");

  const items = await prisma.item.findMany({
    where: { id: { in: input.lines.map((l) => l.itemId) }, companyId: input.companyId },
  });
  const itemById = new Map(items.map((i) => [i.id, i]));

  let subtotal = new D(0);
  let discountTotal = new D(0);
  let taxTotal = new D(0);

  const lineRows = input.lines.map((line) => {
    const item = itemById.get(line.itemId);
    if (!item) throw new Error("صنف غير صحيح");

    const factor =
      line.unitId === item.purchaseUnitId
        ? new D(item.purchaseUnitFactor)
        : line.unitId === item.salesUnitId
          ? new D(item.salesUnitFactor)
          : new D(1);

    const qty = new D(line.qty);
    const unitPrice = new D(line.unitPrice);
    const discount = new D(line.discount ?? 0);
    const lineSubtotal = qty.times(unitPrice);
    const taxAmount = lineSubtotal.minus(discount).times(new D(line.taxRate ?? 0)).div(100);
    const total = lineSubtotal.minus(discount).plus(taxAmount);
    const baseQty = qty.times(factor);
    const costPerBaseUnit = baseQty.isZero() ? new D(0) : lineSubtotal.minus(discount).div(baseQty);

    subtotal = subtotal.plus(lineSubtotal);
    discountTotal = discountTotal.plus(discount);
    taxTotal = taxTotal.plus(taxAmount);

    return {
      itemId: line.itemId,
      unitId: line.unitId,
      qty,
      unitPrice,
      discount,
      tax: taxAmount,
      total,
      costPerBaseUnit,
    };
  });

  const grandTotal = subtotal.minus(discountTotal).plus(taxTotal);
  const paidAmount = new D(input.paidAmount ?? 0);

  return prisma.$transaction(async (tx) => {
    const docNo = await nextDocumentNumber(tx, input.companyId, "purchase");

    const purchase = await tx.purchase.create({
      data: {
        companyId: input.companyId,
        docNo,
        date: input.date,
        supplierId: input.supplierId,
        warehouseId: input.warehouseId,
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        paidAmount,
        remainingAmount: grandTotal.minus(paidAmount),
        paymentMethod: input.paymentMethod,
        status: "DRAFT",
        notes: input.notes,
        userId: input.userId,
        items: { create: lineRows },
      } as never,
    });

    return purchase;
  });
}
