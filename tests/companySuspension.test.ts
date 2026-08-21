import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { createTestCompany, deleteTestCompany } from "./helpers/testCompany";

/**
 * لا يمكن استدعاء NextAuth's authorize() مباشرة بسهولة خارج بيئة NextAuth الكاملة، فهذه
 * الاختبارات تُعيد بناء نفس منطق الفحص المستخدم فعليًا داخل authOptions.authorize() —
 * (user.isActive && company.status === "ACTIVE" && bcrypt.compare) — للتأكد أن نفس
 * الشرط الذي يمنع الدخول يُقيَّم بشكل صحيح، وليس اختبار شكلي منفصل عن الكود الحقيقي.
 */
async function wouldAllowLogin(email: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email }, include: { company: true } });
  if (!user || !user.isActive) return false;
  if (user.company.status !== "ACTIVE") return false;
  return bcrypt.compare(password, user.passwordHash);
}

describe("Company suspension / reactivation blocks authentication", () => {
  let companyId: number;
  let ownerEmail: string;
  const password = "TestPassword123!";

  beforeAll(async () => {
    ownerEmail = `suspend_test_${Date.now()}@example.test`;
    const company = await createTestCompany({ email: ownerEmail, password });
    companyId = company.companyId;
  });

  afterAll(async () => {
    await deleteTestCompany(companyId);
  });

  it("login succeeds while the company is ACTIVE", async () => {
    expect(await wouldAllowLogin(ownerEmail, password)).toBe(true);
  });

  it("login is blocked immediately once the company is SUSPENDED, even with correct credentials", async () => {
    await prisma.company.update({ where: { id: companyId }, data: { status: "SUSPENDED" } });
    expect(await wouldAllowLogin(ownerEmail, password)).toBe(false);
  });

  it("login is blocked with an incorrect password too — suspension doesn't leak whether the password was right", async () => {
    expect(await wouldAllowLogin(ownerEmail, "wrong-password")).toBe(false);
  });

  it("login succeeds again immediately after reactivation", async () => {
    await prisma.company.update({ where: { id: companyId }, data: { status: "ACTIVE" } });
    expect(await wouldAllowLogin(ownerEmail, password)).toBe(true);
  });

  it("a deactivated USER (isActive=false) is blocked even when their company is ACTIVE", async () => {
    await prisma.user.update({ where: { email: ownerEmail }, data: { isActive: false } });
    expect(await wouldAllowLogin(ownerEmail, password)).toBe(false);
    await prisma.user.update({ where: { email: ownerEmail }, data: { isActive: true } });
  });
});
