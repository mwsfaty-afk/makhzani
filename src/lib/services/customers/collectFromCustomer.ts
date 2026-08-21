import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertSubscriptionActive } from "@/lib/services/billing/subscriptionGuard";

const D = Prisma.Decimal;

/**
 * تحصيل مستقل من عميل (بند 33) — غير مرتبط بفاتورة بيع محددة، لسداد مديونية قائمة.
 * ينشئ قيد عميل (credit يخفّض المديونية) وقيد خزينة (وارد) معًا.
 */
export async function collectFromCustomer(input: {
  companyId: number;
  userId: number;
  customerId: number;
  amount: number;
  notes?: string;
}) {
  await assertSubscriptionActive(input.companyId);
  if (input.amount <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر");

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findFirstOrThrow({ where: { id: input.customerId, companyId: input.companyId } });
    const lastTxn = await tx.customerTransaction.findFirst({
      where: { companyId: input.companyId, customerId: input.customerId },
      orderBy: { id: "desc" },
    });
    const prior = lastTxn ? new D(lastTxn.balanceAfter) : new D(customer.openingBalance);
    const balanceAfter = prior.minus(input.amount);
    const now = new Date();

    const transaction = await tx.customerTransaction.create({
      data: {
        companyId: input.companyId,
        customerId: input.customerId,
        type: "collection",
        documentType: "collection",
        documentId: 0,
        debit: 0,
        credit: input.amount,
        balanceAfter,
        date: now,
        notes: input.notes,
      },
    });
    await tx.customerTransaction.update({ where: { id: transaction.id }, data: { documentId: transaction.id } });

    const cashBox = await tx.cashBox.findFirst({ where: { companyId: input.companyId, isDefault: true } });
    if (cashBox) {
      await tx.cashTransaction.create({
        data: {
          companyId: input.companyId,
          cashBoxId: cashBox.id,
          type: "CUSTOMER_COLLECTION",
          amount: input.amount,
          direction: "IN",
          date: now,
          documentType: "collection",
          documentId: transaction.id,
          relatedCustomerId: input.customerId,
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
        module: "customers",
        tableName: "customer_transactions",
        recordId: transaction.id,
        newValue: { customerId: input.customerId, amount: input.amount },
      },
    });

    return transaction;
  });
}
