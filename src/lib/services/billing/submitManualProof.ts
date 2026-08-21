import { prisma } from "@/lib/db/prisma";

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export class InvalidProofFileError extends Error {}

/** يُبقي فقط اسم الملف (بدون مسارات) ويستبعد أي رمز غير آمن قبل تخزينه — الاسم يُدخَل لاحقًا
 * في ترويسة Content-Disposition عند العرض، فلا يجب أن يحمل علامات اقتباس أو أحرف تحكم. */
function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  const cleaned = base.replace(/[^\w.\- ]/g, "_").slice(0, 150);
  return cleaned || "file";
}

/** يتحقق من محتوى الملف الفعلي (Magic Bytes) بدل الثقة بـ file.type المُرسَل من المتصفح
 * فقط — يمكن لأي عميل التلاعب بترويسة Content-Type متعمَّدًا (مثلًا رفع ملف تنفيذي بامتداد
 * ‎.jpg وMIME مزيَّف)، فالتحقق الحقيقي الوحيد هو من البايتات الأولى الفعلية للملف. */
function matchesDeclaredType(buffer: Buffer, mimeType: string): boolean {
  const bytes = buffer.subarray(0, 12);
  switch (mimeType) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    case "image/webp":
      return (
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
      );
    case "application/pdf":
      return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
    default:
      return false;
  }
}

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
  if (!matchesDeclaredType(input.fileBuffer, input.fileMimeType)) {
    throw new InvalidProofFileError("محتوى الملف لا يطابق نوعه المعلَن — يرجى رفع صورة أو PDF حقيقي");
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
      proofFileName: sanitizeFileName(input.fileName),
    },
  });
}
