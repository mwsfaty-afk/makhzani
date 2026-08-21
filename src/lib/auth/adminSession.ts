import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { encode, decode } from "next-auth/jwt";
import { prisma } from "@/lib/db/prisma";

/**
 * جلسة مستقلة تمامًا عن NextAuth الخاص بمستخدمي الشركات (لا companyId هنا إطلاقًا —
 * PlatformAdmin كيان على مستوى المنصة، خارج نطاق أي Tenant). نستخدم encode/decode
 * الجاهزين من next-auth/jwt (نفس NEXTAUTH_SECRET) بدل تسجيل Provider ثانٍ على نفس
 * authOptions، لتفادي أي تعارض في callbacks/pages.signIn مع جلسة المستخدمين العاديين.
 */
const COOKIE_NAME = "makhzani_admin_session";
const MAX_AGE = 60 * 60 * 8; // 8 ساعات

export async function createAdminSession(adminId: number) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET غير مضبوط");
  // `as any`: next-auth/jwt's JWT type مُوسَّع في هذا المشروع بحقول جلسة الشركات (companyId...) —
  // جلسة الأدمن شكل مختلف تمامًا (adminId فقط)، وهذا encode/decode عام لا يهتم فعليًا بالشكل وقت التشغيل.
  const token = await encode({ token: { adminId } as never, secret, maxAge: MAX_AGE });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requirePlatformAdmin() {
  const secret = process.env.NEXTAUTH_SECRET;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token || !secret) redirect("/admin/login");

  let adminId: number | undefined;
  try {
    const decoded = await decode({ token: token!, secret: secret! });
    adminId = (decoded as { adminId?: number } | null)?.adminId;
  } catch {
    redirect("/admin/login");
  }
  if (!adminId) redirect("/admin/login");

  const admin = await prisma.platformAdmin.findUnique({ where: { id: adminId } });
  if (!admin || !admin.isActive) redirect("/admin/login");

  return admin;
}
