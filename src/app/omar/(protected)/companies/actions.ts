"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/adminSession";
import { prisma } from "@/lib/db/prisma";
import { logAdminAction } from "@/lib/services/admin/auditLog";
import { toUserErrorMessage } from "@/lib/errors";

const VALID_STATUSES = new Set(["ACTIVE", "SUSPENDED", "CANCELLED"]);

/** تغيير حالة شركة (تفعيل/تعطيل/إلغاء) — التعطيل يمنع الدخول فورًا (بند 15 بخارطة الطريق):
 * تسجيل دخول جديد يُرفض في authOptions.authorize()، وأي جلسة مفتوحة بالفعل تُوقَف عند
 * أول طلب لاحق عبر requireTenant() (كلاهما يتحقق من Company.status مباشرة من القاعدة). */
export async function setCompanyStatusAction(companyId: number, status: string) {
  const admin = await requirePlatformAdmin();
  if (!VALID_STATUSES.has(status)) return { error: "حالة غير صحيحة" };

  const before = await prisma.company.findUnique({ where: { id: companyId }, select: { status: true } });
  await prisma.company.update({ where: { id: companyId }, data: { status: status as "ACTIVE" | "SUSPENDED" | "CANCELLED" } });

  await logAdminAction({
    adminId: admin.id,
    action: status === "ACTIVE" ? "company.activate" : status === "SUSPENDED" ? "company.suspend" : "company.cancel",
    targetType: "company",
    targetId: companyId,
    details: { fromStatus: before?.status, toStatus: status },
  });

  revalidatePath(`/omar/companies/${companyId}`);
  revalidatePath("/omar/companies");
  revalidatePath("/omar/dashboard");
  return { success: true };
}

/** يمدّد فترة اشتراك شركة بعدد أيام (دعم/دفعة يدوية خارج بوابات الدفع المعتادة) — يُضاف
 * على تاريخ الانتهاء الحالي إن كان ما زال في المستقبل (تمديد حقيقي، لا إعادة ضبط)، أو من
 * الآن إن كان قد انتهى بالفعل. أي حالة اشتراك غير ACTIVE تُعاد لـACTIVE — الهدف الوحيد من
 * هذا الفعل هو "امنح هذه الشركة وقتًا إضافيًا"، بصرف النظر عن سبب توقفها. */
export async function extendSubscriptionAction(
  companyId: number,
  days: number,
): Promise<{ error: string } | { success: true; newPeriodEnd: Date }> {
  const admin = await requirePlatformAdmin();
  if (!Number.isInteger(days) || days <= 0 || days > 3650) {
    return { error: "عدد الأيام يجب أن يكون رقمًا صحيحًا موجبًا (حتى 3650 يومًا)" };
  }

  const subscription = await prisma.subscription.findUnique({ where: { companyId } });
  if (!subscription) return { error: "لا يوجد اشتراك مسجَّل لهذه الشركة" };

  const now = new Date();
  const base = subscription.currentPeriodEnd > now ? subscription.currentPeriodEnd : now;
  const newPeriodEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  await prisma.subscription.update({
    where: { companyId },
    data: { currentPeriodEnd: newPeriodEnd, status: "ACTIVE" },
  });

  await logAdminAction({
    adminId: admin.id,
    action: "company.extendSubscription",
    targetType: "company",
    targetId: companyId,
    details: { days, previousPeriodEnd: subscription.currentPeriodEnd, newPeriodEnd },
  });

  revalidatePath(`/omar/companies/${companyId}`);
  return { success: true, newPeriodEnd };
}

const contactSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صحيح"),
  phone: z.string().optional(),
});

/** يعدّل بريد وهاتف التواصل لشركة معيّنة — يُطبَّق على الشركة **وعلى المالك** معًا، لأن
 * تسجيل الدخول يتحقق من بريد المستخدم (User.email) لا بريد الشركة (بند دعم: عميل فقد
 * الوصول لبريده القديم فلا يقدر يغيّره بنفسه، فيتواصل مع الأدمن). البريد فريد على مستوى
 * المنصة كلها (User.email @unique)، فيُرفَض التعديل بوضوح لو مستخدَم من حساب آخر بدل
 * فشل قاعدة البيانات الخام. */
export async function updateCompanyContactAction(
  companyId: number,
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  const admin = await requirePlatformAdmin();

  const parsed = contactSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  const email = parsed.data.email.toLowerCase().trim();
  const phone = parsed.data.phone?.trim() || null;

  const owner = await prisma.user.findFirst({ where: { companyId, isOwner: true } });
  if (!owner) return { error: "لا يوجد مالك حساب مسجَّل لهذه الشركة" };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== owner.id) {
    return { error: "هذا البريد الإلكتروني مستخدَم بالفعل من حساب آخر على المنصة" };
  }

  try {
    await prisma.$transaction([
      prisma.company.update({ where: { id: companyId }, data: { email, phone } }),
      prisma.user.update({ where: { id: owner.id }, data: { email, phone } }),
      // نفس منطق مسح محاولات الدخول الفاشلة في resetCompanyOwnerPasswordAction — عميل قد
      // يكون جرّب الدخول بالبريد الجديد الصحيح (لكن بكلمة مرور خاطئة) عدة مرات قبل أن
      // يكتشف أن المشكلة كانت في البريد المسجَّل أصلًا، فيبقى محظورًا رغم تصحيح البريد الآن.
      prisma.loginAttempt.deleteMany({ where: { identifier: email } }),
    ]);
  } catch (err) {
    return { error: toUserErrorMessage(err, "تعذّر تحديث بيانات التواصل") };
  }

  await logAdminAction({
    adminId: admin.id,
    action: "company.updateContact",
    targetType: "company",
    targetId: companyId,
    details: { newEmail: email, newPhone: phone },
  });

  revalidatePath(`/omar/companies/${companyId}`);
  revalidatePath("/omar/companies");
  return { success: true };
}

/** يعيد تعيين كلمة مرور مالك حساب شركة إلى كلمة عشوائية مؤقتة، ويُعيدها **مرة واحدة فقط**
 * في استجابة هذا الفعل لعرضها للأدمن (لإبلاغ العميل بها يدويًا) — لا تُخزَّن ولا تُسجَّل في
 * سجل التدقيق نصًا صريحًا بأي شكل، فقط الـhash الفعلي في User.passwordHash.
 *
 * يمسح أيضًا محاولات الدخول الفاشلة المسجَّلة لهذا البريد (assertNotRateLimited في
 * rateLimit.ts يمنع الدخول بعد 5 محاولات فاشلة خلال 15 دقيقة) — بدون هذا، عميل حاول عدة
 * مرات بكلمة مروره القديمة المنسية قبل التواصل مع الدعم يبقى محظورًا حتى بعد الحصول على
 * كلمة مرور صحيحة جديدة، ورسالة الدخول العامة "بيانات الدخول غير صحيحة" لا تميّز هذه
 * الحالة عن كلمة مرور خاطئة فعليًا — إعادة التعيين يجب أن تمنح بداية نظيفة حقًا. */
export async function resetCompanyOwnerPasswordAction(
  companyId: number,
): Promise<{ error: string } | { success: true; tempPassword: string; ownerEmail: string }> {
  const admin = await requirePlatformAdmin();

  const owner = await prisma.user.findFirst({ where: { companyId, isOwner: true } });
  if (!owner) return { error: "لا يوجد مالك حساب مسجَّل لهذه الشركة" };

  const tempPassword = randomBytes(9).toString("base64url"); // 12 حرفًا تقريبًا، عشوائي حقيقي
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: owner.id }, data: { passwordHash } }),
    prisma.loginAttempt.deleteMany({ where: { identifier: owner.email } }),
  ]);

  await logAdminAction({
    adminId: admin.id,
    action: "company.resetOwnerPassword",
    targetType: "company",
    targetId: companyId,
    details: { ownerUserId: owner.id },
  });

  return { success: true, tempPassword, ownerEmail: owner.email };
}
