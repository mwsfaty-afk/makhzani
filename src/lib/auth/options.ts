import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { assertNotRateLimited, recordLoginAttempt } from "./rateLimit";

// Hash صالح البنية لكلمة مرور لن تتطابق أبدًا — يُستخدم عند عدم وجود المستخدم أصلًا حتى
// تبقى مدة bcrypt.compare ثابتة تقريبًا سواء كان البريد مسجَّلًا أم لا (منع تسريب عبر التوقيت).
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8w6cyOjhpJcOJ7CvNzY7c6JsY.mkty";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const identifier = credentials.email.toLowerCase().trim();

        await assertNotRateLimited(identifier);

        const user = await prisma.user.findUnique({
          where: { email: identifier },
          include: { role: true, company: true },
        });

        // مقارنة تتم دائمًا حتى لو لم يوجد المستخدم إطلاقًا — تُبقي زمن الاستجابة شبه ثابت
        // بدل أن يكشف رد سريع فورًا أن هذا البريد غير مسجَّل أصلًا.
        const passwordValid = await bcrypt.compare(credentials.password, user?.passwordHash ?? DUMMY_HASH);

        const isValid = Boolean(user) && user!.isActive && user!.company.status === "ACTIVE" && passwordValid;
        await recordLoginAttempt(identifier, isValid);

        if (!isValid) return null;

        await prisma.user.update({ where: { id: user!.id }, data: { lastLoginAt: new Date() } });

        return {
          id: String(user!.id),
          name: user!.name,
          email: user!.email,
          companyId: user!.companyId,
          roleId: user!.roleId,
          roleName: user!.role?.name ?? null,
          isOwner: user!.isOwner,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = Number(user.id);
        token.companyId = user.companyId;
        token.roleId = user.roleId;
        token.roleName = user.roleName;
        token.isOwner = user.isOwner;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.companyId = token.companyId;
      session.user.roleId = token.roleId;
      session.user.roleName = token.roleName;
      session.user.isOwner = token.isOwner;
      return session;
    },
  },
};
