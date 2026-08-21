import { prisma } from "@/lib/db/prisma";

const WINDOW_MS = 15 * 60 * 1000; // 15 دقيقة
const MAX_FAILED_ATTEMPTS = 5;

export class RateLimitedError extends Error {
  constructor() {
    super("عدد محاولات الدخول الفاشلة كبير جدًا. يرجى المحاولة مرة أخرى بعد 15 دقيقة.");
    this.name = "RateLimitedError";
  }
}

/** يمنع Brute-Force على تسجيل الدخول — يُفحص *قبل* التحقق من كلمة المرور، بحيث تبقى نافذة
 * الحظر واحدة سواء كان الحساب موجودًا أصلًا أم لا (لا يُسرَّب وجود الحساب عبر هذا الفحص). */
export async function assertNotRateLimited(identifier: string) {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const failedCount = await prisma.loginAttempt.count({
    where: { identifier, success: false, createdAt: { gte: windowStart } },
  });
  if (failedCount >= MAX_FAILED_ATTEMPTS) {
    throw new RateLimitedError();
  }
}

export async function recordLoginAttempt(identifier: string, success: boolean) {
  await prisma.loginAttempt.create({ data: { identifier, success } });
}
