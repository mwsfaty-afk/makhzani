import { Prisma } from "@prisma/client";

/**
 * يحوّل أي خطأ مُلتَقط في Server Action إلى رسالة آمنة للعميل: أخطاء أعمالنا المتعمَّدة
 * (throw new Error("رسالة عربية واضحة") في خدماتنا) تُعرض كما هي، أما أخطاء Prisma/النظام
 * غير المتوقعة (قد تحمل أسماء جداول/أعمدة أو تفاصيل استعلام داخلية) فتُستبدل برسالة عامة —
 * لا يجب أبدًا أن يصل نص خطأ قاعدة بيانات خام إلى واجهة المستخدم.
 */
export function toUserErrorMessage(err: unknown, fallback = "حدث خطأ غير متوقع، حاول مرة أخرى"): string {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientValidationError ||
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError
  ) {
    return fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
