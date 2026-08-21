import { prisma } from "@/lib/db/prisma";
import { assertSubscriptionActive } from "@/lib/services/billing/subscriptionGuard";

/**
 * تحويل مبلغ بين خزينتين (مثل: من الخزينة النقدية إلى حساب بنكي) — بند 32.
 * ممنوع التحويل لنفس الخزينة — تحقق إلزامي في الـ Backend.
 */
export async function transferBetweenCashBoxes(input: {
  companyId: number;
  userId: number;
  fromCashBoxId: number;
  toCashBoxId: number;
  amount: number;
  notes?: string;
}) {
  await assertSubscriptionActive(input.companyId);
  if (input.fromCashBoxId === input.toCashBoxId) {
    throw new Error("لا يمكن التحويل من وإلى نفس الخزينة");
  }
  if (input.amount <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر");

  return prisma.$transaction(async (tx) => {
    await tx.cashBox.findFirstOrThrow({ where: { id: input.fromCashBoxId, companyId: input.companyId } });
    await tx.cashBox.findFirstOrThrow({ where: { id: input.toCashBoxId, companyId: input.companyId } });
    const now = new Date();

    const out = await tx.cashTransaction.create({
      data: {
        companyId: input.companyId,
        cashBoxId: input.fromCashBoxId,
        type: "TRANSFER",
        amount: input.amount,
        direction: "OUT",
        date: now,
        documentType: "cash_transfer",
        userId: input.userId,
        notes: input.notes,
      },
    });

    await tx.cashTransaction.create({
      data: {
        companyId: input.companyId,
        cashBoxId: input.toCashBoxId,
        type: "TRANSFER",
        amount: input.amount,
        direction: "IN",
        date: now,
        documentType: "cash_transfer",
        documentId: out.id,
        userId: input.userId,
        notes: input.notes,
      },
    });

    await tx.cashTransaction.update({ where: { id: out.id }, data: { documentId: out.id } });

    await tx.auditLog.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        action: "create",
        module: "cash",
        tableName: "cash_transactions",
        recordId: out.id,
        newValue: { fromCashBoxId: input.fromCashBoxId, toCashBoxId: input.toCashBoxId, amount: input.amount },
      },
    });

    return out;
  });
}
