import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * ترقيم مستندات قابل للتخصيص (بند 54) — Prefix وTemplate يُقرآن من document_sequences،
 * وليسا مكتوبين في الكود. مثال الناتج: PUR-2026-000001
 */
export async function nextDocumentNumber(tx: Tx, companyId: number, docType: string): Promise<string> {
  const seq = await tx.documentSequence.findUnique({
    where: { companyId_docType: { companyId, docType } },
  });
  if (!seq) {
    throw new Error(`لا يوجد إعداد ترقيم للمستند: ${docType}`);
  }

  const updated = await tx.documentSequence.update({
    where: { id: seq.id },
    data: { nextNumber: { increment: 1 } },
  });

  const usedNumber = updated.nextNumber - 1;
  const padded = String(usedNumber).padStart(seq.padLength, "0");
  const year = seq.yearInNumber ? `${new Date().getFullYear()}-` : "";
  return `${seq.prefix}-${year}${padded}`;
}
