"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { createAdminSession } from "@/lib/auth/adminSession";
import { assertNotRateLimited, recordLoginAttempt, RateLimitedError } from "@/lib/auth/rateLimit";

// نفس منطق التحقق ذي الزمن الثابت المستخدم لدخول الشركات — مفتاح Brute-Force منفصل
// ("admin:" prefix) عن محاولات دخول الشركات حتى لا يتشارك العدّاد بينهما.
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8w6cyOjhpJcOJ7CvNzY7c6JsY.mkty";

export async function adminLoginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const password = String(formData.get("password") ?? "");
  const identifier = `admin:${email}`;

  try {
    await assertNotRateLimited(identifier);
  } catch (err) {
    if (err instanceof RateLimitedError) return { error: err.message };
    throw err;
  }

  const admin = await prisma.platformAdmin.findUnique({ where: { email } });
  const passwordValid = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  const isValid = Boolean(admin) && admin!.isActive && passwordValid;

  await recordLoginAttempt(identifier, isValid);
  if (!isValid) return { error: "بيانات الدخول غير صحيحة" };

  await prisma.platformAdmin.update({ where: { id: admin!.id }, data: { lastLoginAt: new Date() } });
  await createAdminSession(admin!.id);

  redirect("/admin/dashboard");
}
