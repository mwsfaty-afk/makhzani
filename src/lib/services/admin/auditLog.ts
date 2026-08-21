import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/** يسجّل إجراء أدمن منصة حسّاسًا (بند 8 — Admin Security). لا يرمي أبدًا استثناءً يوقف
 * العملية الأساسية — فشل تسجيل التدقيق لا يجب أن يمنع تنفيذ إجراء صحيح بالفعل. */
export async function logAdminAction(params: {
  adminId: number;
  action: string;
  targetType: string;
  targetId?: number;
  details?: Record<string, unknown>;
}) {
  try {
    await prisma.platformAuditLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        details: (params.details ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch {
    // متعمَّد: لا نُفشل الإجراء الأساسي بسبب فشل تسجيل التدقيق وحده
  }
}
