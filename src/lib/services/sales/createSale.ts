import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { nextDocumentNumber } from "@/lib/services/documentNumbering";
import { assertSubscriptionActive } from "@/lib/services/billing/subscriptionGuard";
import { enforceMonthlyDocumentLimit } from "@/lib/services/billing/enforceLimit";

const D = Prisma.Decimal;

export type CreateSaleLine = {
  itemId: number;
  unitId: number;
  qty: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
};

export type CreateSaleInput = {
  companyId: number;
  customerId: number;
  warehouseId: number;
  date: Date;
  paymentMethod?: string;
  paidAmount?: number;
  notes?: string;
  userId: number;
  lines: CreateSaleLine[];
};

/**
 * إنشاء فاتورة بيع كمسودة فقط — لا أثر على المخزون أو الحسابات (docs/ARCHITECTURE.md §6).
 * تكلفة البضاعة المباعة والربح **لا تُحسب هنا** لأنها تعتمد على متوسط التكلفة وقت الاعتماد
 * الفعلي (قد يتغير بين إنشاء المسودة واعتمادها) — تُحسب وتُملأ داخل postSale().
 */
export async function createSale(input: CreateSaleInput) {
  await assertSubscriptionActive(input.companyId);
  await enforceMonthlyDocumentLimit(input.companyId);
  if (input.lines.length === 0) throw new Error("يجب إضافة صنف واحد على الأقل");

  const items = await prisma.item.findMany({
    where: { id: { in: input.lines.map((l) => l.itemId) }, companyId: input.companyId },
  });
  const itemById = new Map(items.map((i) => [i.id, i]));

  let subtotal = new D(0);
  let discountTotal = new D(0);
  let taxTotal = new D(0);

  const lineRows = input.lines.map((line) => {
    if (!itemById.has(line.itemId)) throw new Error("صنف غير صحيح");

    const qty = new D(line.qty);
    const unitPrice = new D(line.unitPrice);
    const discount = new D(line.discount ?? 0);
    const lineSubtotal = qty.times(unitPrice);
    const taxAmount = lineSubtotal.minus(discount).times(new D(line.taxRate ?? 0)).div(100);
    const total = lineSubtotal.minus(discount).plus(taxAmount);

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
      costPerBaseUnit: new D(0),
      totalCost: new D(0),
      profit: new D(0),
    };
  });

  const grandTotal = subtotal.minus(discountTotal).plus(taxTotal);
  const paidAmount = new D(input.paidAmount ?? 0);

  return prisma.$transaction(async (tx) => {
    const docNo = await nextDocumentNumber(tx, input.companyId, "sale");

    const sale = await tx.sale.create({
      data: {
        companyId: input.companyId,
        docNo,
        date: input.date,
        customerId: input.customerId,
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

    return sale;
  });
}
