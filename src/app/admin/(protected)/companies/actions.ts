"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/adminSession";
import { prisma } from "@/lib/db/prisma";

const VALID_STATUSES = new Set(["ACTIVE", "SUSPENDED", "CANCELLED"]);

/** تغيير حالة شركة (تفعيل/تعطيل/إلغاء) — التعطيل يمنع الدخول فورًا (بند 15 بخارطة الطريق):
 * تسجيل دخول جديد يُرفض في authOptions.authorize()، وأي جلسة مفتوحة بالفعل تُوقَف عند
 * أول طلب لاحق عبر requireTenant() (كلاهما يتحقق من Company.status مباشرة من القاعدة). */
export async function setCompanyStatusAction(companyId: number, status: string) {
  await requirePlatformAdmin();
  if (!VALID_STATUSES.has(status)) return { error: "حالة غير صحيحة" };

  await prisma.company.update({ where: { id: companyId }, data: { status: status as "ACTIVE" | "SUSPENDED" | "CANCELLED" } });

  revalidatePath(`/admin/companies/${companyId}`);
  revalidatePath("/admin/companies");
  revalidatePath("/admin/dashboard");
  return { success: true };
}
