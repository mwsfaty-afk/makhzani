import { prisma } from "@/lib/db/prisma";

/** رصيد الخزينة = SUM(IN) - SUM(OUT) — لا حقل رصيد مخزَّن يُعدَّل يدويًا (بند 26 بنفس المبدأ). */
export async function getCashBoxBalance(companyId: number, cashBoxId: number) {
  const [inSum, outSum] = await Promise.all([
    prisma.cashTransaction.aggregate({
      where: { companyId, cashBoxId, direction: "IN" },
      _sum: { amount: true },
    }),
    prisma.cashTransaction.aggregate({
      where: { companyId, cashBoxId, direction: "OUT" },
      _sum: { amount: true },
    }),
  ]);
  const total = Number(inSum._sum.amount ?? 0) - Number(outSum._sum.amount ?? 0);
  return total;
}
