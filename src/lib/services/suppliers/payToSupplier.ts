import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertSubscriptionActive } from "@/lib/services/billing/subscriptionGuard";

const D = Prisma.Decimal;

/**
 * سداد مستقل لمورد (بند 34) — غير مرتبط بفاتورة شراء محددة، لسداد مديونية قائمة.
 * ينشئ قيد مورد (debit يخفّض المديونية) وقيد خزينة (صادر) معًا.
 */
export async function payToSupplier(input: {
  companyId: number;
  userId: number;
  supplierId: number;
  amount: number;
  notes?: string;
}) {
  await assertSubscriptionActive(input.companyId);
  if (input.amount <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر");

  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findFirstOrThrow({ where: { id: input.supplierId, companyId: input.companyId } });
    const lastTxn = await tx.supplierTransaction.findFirst({
      where: { companyId: input.companyId, supplierId: input.supplierId },
      orderBy: { id: "desc" },
    });
    const prior = lastTxn ? new D(lastTxn.balanceAfter) : new D(supplier.openingBalance);
    const balanceAfter = prior.minus(input.amount);
    const now = new Date();

    const transaction = await tx.supplierTransaction.create({
      data: {
        companyId: input.companyId,
        supplierId: input.supplierId,
        type: "payment",
        documentType: "payment",
        documentId: 0,
        debit: input.amount,
        credit: 0,
        balanceAfter,
        date: now,
        notes: input.notes,
      },
    });
    await tx.supplierTransaction.update({ where: { id: transaction.id }, data: { documentId: transaction.id } });

    const cashBox = await tx.cashBox.findFirst({ where: { companyId: input.companyId, isDefault: true } });
    if (cashBox) {
      await tx.cashTransaction.create({
        data: {
          companyId: input.companyId,
          cashBoxId: cashBox.id,
          type: "SUPPLIER_PAYMENT",
          amount: input.amount,
          direction: "OUT",
          date: now,
          documentType: "payment",
          documentId: transaction.id,
          relatedSupplierId: input.supplierId,
          userId: input.userId,
          notes: input.notes,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        action: "create",
        module: "suppliers",
        tableName: "supplier_transactions",
        recordId: transaction.id,
        newValue: { supplierId: input.supplierId, amount: input.amount },
      },
    });

    return transaction;
  });
}
