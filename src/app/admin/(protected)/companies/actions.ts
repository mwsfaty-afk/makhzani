"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/adminSession";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/services/admin/auditLog";

const VALID_STATUSES = new Set(["ACTIVE", "SUSPENDED", "CANCELLED"]);

/** تغيير حالة شركة (تفعيل/تعطيل/إلغاء) — التعطيل يمنع الدخول فورًا (بند 15 بخارطة الطريق):
 * تسجيل دخول جديد يُرفض في authOptions.authorize()، وأي جلسة مفتوحة بالفعل تُوقَف عند
 * أول طلب لاحق عبر requireTenant() (كلاهما يتحقق من Company.status مباشرة من القاعدة). */
export async function setCompanyStatusAction(companyId: number, status: string) {
  const admin = await requirePlatformAdmin();
  if (!VALID_STATUSES.has(status)) return { error: "حالة غير صحيحة" };

  const before = await prisma.company.findUnique({ where: { id: companyId }, select: { status: true } });
  await prisma.company.update({ where: { id: companyId }, data: { status: status as "ACTIVE" | "SUSPENDED" | "CANCELLED" } });

  await logAdminAction({
    adminId: admin.id,
    action: status === "ACTIVE" ? "company.activate" : status === "SUSPENDED" ? "company.suspend" : "company.cancel",
    targetType: "company",
    targetId: companyId,
    details: { fromStatus: before?.status, toStatus: status },
  });

  revalidatePath(`/admin/companies/${companyId}`);
  revalidatePath("/admin/companies");
  revalidatePath("/admin/dashboard");
  return { success: true };
}
