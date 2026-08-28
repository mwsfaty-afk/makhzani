import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const { companyId } = await requireTenant();
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { salesEnabled: true } });

  if (!company.salesEnabled) redirect("/dashboard");

  return children;
}
