import { prisma } from "@/lib/db/prisma";
import { assertSubscriptionActive } from "@/lib/services/billing/subscriptionGuard";

/**
 * قبض أو صرف نقدي مستقل (بند 32) — غير مرتبط بعميل أو مورد أو فاتورة (مثل مصروفات
 * تشغيلية أو إيرادات أخرى). لا يُعدَّل رصيد الخزينة يدويًا — كل شيء عبر هذه الحركة.
 */
export async function recordCashTransaction(input: {
  companyId: number;
  userId: number;
  cashBoxId: number;
  type: "RECEIPT" | "PAYMENT";
  amount: number;
  notes?: string;
}) {
  await assertSubscriptionActive(input.companyId);
  if (input.amount <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر");

  return prisma.$transaction(async (tx) => {
    const cashBox = await tx.cashBox.findFirstOrThrow({ where: { id: input.cashBoxId, companyId: input.companyId } });

    const transaction = await tx.cashTransaction.create({
      data: {
        companyId: input.companyId,
        cashBoxId: cashBox.id,
        type: input.type,
        amount: input.amount,
        direction: input.type === "RECEIPT" ? "IN" : "OUT",
        date: new Date(),
        documentType: input.type === "RECEIPT" ? "receipt" : "payment",
        userId: input.userId,
        notes: input.notes,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        action: "create",
        module: "cash",
        tableName: "cash_transactions",
        recordId: transaction.id,
        newValue: { cashBoxId: cashBox.id, type: input.type, amount: input.amount },
      },
    });

    return transaction;
  });
}
