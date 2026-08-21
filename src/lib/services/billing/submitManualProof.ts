import { prisma } from "@/lib/db/prisma";

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export class InvalidProofFileError extends Error {}

/** يُرفق رقم مرجع + إثبات دفع (صورة/PDF) على دفعة يدوية لا تزال PENDING — لا يُفعّل
 * الاشتراك هنا؛ التفعيل يتم فقط بعد موافقة أدمن المنصة (activateSubscriptionFromPayment). */
export async function attachManualPaymentProof(input: {
  paymentId: number;
  companyId: number;
  referenceNumber: string;
  fileBuffer: Buffer;
  fileMimeType: string;
  fileName: string;
}) {
  if (input.fileBuffer.byteLength > MAX_PROOF_BYTES) {
    throw new InvalidProofFileError("حجم الملف كبير جدًا — الحد الأقصى 5 ميجابايت");
  }
  if (!ALLOWED_MIME_TYPES.has(input.fileMimeType)) {
    throw new InvalidProofFileError("نوع الملف غير مدعوم — يُقبل فقط صورة (JPG/PNG/WebP) أو PDF");
  }
  if (!input.referenceNumber.trim()) {
    throw new InvalidProofFileError("رقم المرجع/العملية مطلوب");
  }

  const payment = await prisma.payment.findFirst({ where: { id: input.paymentId, companyId: input.companyId } });
  if (!payment) throw new Error("الدفعة غير موجودة");
  if (payment.status !== "PENDING") throw new Error("لا يمكن تعديل دفعة تمت مراجعتها بالفعل");

  return prisma.payment.update({
    where: { id: input.paymentId },
    data: {
      referenceNumber: input.referenceNumber.trim(),
      proofData: new Uint8Array(input.fileBuffer),
      proofMimeType: input.fileMimeType,
      proofFileName: input.fileName,
    },
  });
}
