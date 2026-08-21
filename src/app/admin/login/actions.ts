"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { createAdminSession } from "@/lib/auth/adminSession";

export async function adminLoginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const password = String(formData.get("password") ?? "");

  const admin = await prisma.platformAdmin.findUnique({ where: { email } });
  if (!admin || !admin.isActive) return { error: "بيانات الدخول غير صحيحة" };

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) return { error: "بيانات الدخول غير صحيحة" };

  await prisma.platformAdmin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await createAdminSession(admin.id);

  redirect("/admin/payments");
}
