import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./options";
import { tenantPrisma } from "@/lib/db/tenant";
import { prisma } from "@/lib/db/prisma";

/**
 * يُستدعى في بداية أي Server Component/Action محمي داخل لوحة الشركة. يتحقق أيضًا من أن
 * الشركة ما زالت ACTIVE في كل طلب — وليس فقط عند تسجيل الدخول — بحيث تعطيل شركة من لوحة
 * الأدمن (Phase 15) يمنع الوصول فورًا حتى لجلسة مفتوحة بالفعل (JWT لا يُعاد التحقق منه
 * تلقائيًا، فهذا الفحص هو ما يمنع الاستمرار).
 */
export async function requireTenant() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    redirect("/login");
  }
  const { id: userId, companyId, roleId, roleName, isOwner } = session.user;

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { status: true } });
  if (!company || company.status !== "ACTIVE") {
    redirect("/account-suspended");
  }

  return {
    session,
    userId,
    companyId,
    roleId,
    roleName,
    isOwner,
    db: tenantPrisma(companyId),
  };
}
