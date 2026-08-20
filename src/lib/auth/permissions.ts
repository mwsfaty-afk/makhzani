import { prisma } from "@/lib/db/prisma";

export class PermissionDeniedError extends Error {
  constructor(code: string) {
    super(`Permission denied: ${code}`);
    this.name = "PermissionDeniedError";
  }
}

/**
 * الأولوية: Deny على مستوى المستخدم > Grant على مستوى المستخدم > صلاحيات الدور.
 * Owner دائمًا لديه كل الصلاحيات بغض النظر عن جدول الأدوار (بند 37).
 */
export async function hasPermission(params: {
  userId: number;
  roleId: number | null;
  isOwner: boolean;
  code: string;
}): Promise<boolean> {
  if (params.isOwner) return true;

  const userOverride = await prisma.userPermission.findFirst({
    where: { userId: params.userId, permission: { code: params.code } },
  });
  if (userOverride?.effect === "DENY") return false;
  if (userOverride?.effect === "GRANT") return true;

  if (!params.roleId) return false;

  const rolePermission = await prisma.rolePermission.findFirst({
    where: { roleId: params.roleId, permission: { code: params.code } },
  });
  return Boolean(rolePermission);
}

export async function requirePermission(params: {
  userId: number;
  roleId: number | null;
  isOwner: boolean;
  code: string;
}) {
  const allowed = await hasPermission(params);
  if (!allowed) throw new PermissionDeniedError(params.code);
}
