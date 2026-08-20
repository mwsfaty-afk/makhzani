import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./options";
import { tenantPrisma } from "@/lib/db/tenant";

/** يُستدعى في بداية أي Server Component/Action محمي داخل لوحة الشركة. */
export async function requireTenant() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    redirect("/login");
  }
  const { id: userId, companyId, roleId, roleName, isOwner } = session.user;
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
