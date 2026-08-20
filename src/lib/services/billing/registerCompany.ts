import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_ROLES } from "@/lib/permissions/catalog";

export type RegisterCompanyInput = {
  companyName: string;
  ownerName: string;
  email: string;
  phone?: string;
  password: string;
  country: string;
  businessType?: string;
};

const COUNTRY_DEFAULTS: Record<string, { currency: string; currencySymbol: string; timezone: string }> = {
  SA: { currency: "SAR", currencySymbol: "ر.س", timezone: "Asia/Riyadh" },
  EG: { currency: "EGP", currencySymbol: "ج.م", timezone: "Africa/Cairo" },
};

const DOCUMENT_SEQUENCES: Array<[string, string]> = [
  ["purchase", "PUR"],
  ["sale", "SAL"],
  ["purchase_return", "PRT"],
  ["sale_return", "SRT"],
  ["transfer", "TRF"],
  ["stock_in", "STI"],
  ["stock_out", "STO"],
  ["stock_take", "STK"],
];

/**
 * دورة تسجيل شركة جديدة كاملة (بند 5، docs/ARCHITECTURE.md §8.3): كل ما يلزم لبدء
 * العمل فورًا يُنشأ ضمن Transaction واحدة — لا حالة وسيطة ناقصة إن فشلت أي خطوة.
 */
export async function registerCompany(input: RegisterCompanyInput) {
  const email = input.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("هذا البريد الإلكتروني مستخدم بالفعل");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const countryDefaults = COUNTRY_DEFAULTS[input.country];

  const allPermissions = await prisma.permission.findMany();
  const permissionByCode = new Map(allPermissions.map((p) => [p.code, p]));
  if (allPermissions.length === 0) {
    throw new Error("كتالوج الصلاحيات غير مهيأ — شغّل `npm run db:seed` أولًا");
  }

  const trialPlan = await prisma.plan.findUnique({ where: { code: "trial" } });
  if (!trialPlan) {
    throw new Error("خطة التجربة غير مهيأة — شغّل `npm run db:seed` أولًا");
  }

  const now = new Date();
  const trialEnd = new Date(now.getTime() + trialPlan.durationDays * 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: input.companyName,
        ownerName: input.ownerName,
        email,
        phone: input.phone,
        country: input.country,
        currency: countryDefaults?.currency ?? "EGP",
        currencySymbol: countryDefaults?.currencySymbol ?? "ج.م",
        timezone: countryDefaults?.timezone ?? "Africa/Cairo",
        businessType: input.businessType,
      },
    });

    // كل أدوار البداية تُنشأ أولًا، ثم كل صلاحيات كل الأدوار تُدرج دفعة واحدة —
    // بدل جولة شبكة منفصلة لكل دور (8 أدوار × استعلامين) لتفادي انتهاء مهلة الـ
    // Transaction عبر الشبكة (Supabase على أوروبا) قبل اكتمال كل الخطوات.
    const roleIdByName = new Map<string, number>();
    for (const [roleName] of Object.entries(DEFAULT_ROLES)) {
      const role = await tx.role.create({
        data: { companyId: company.id, name: roleName, isSystem: true },
      });
      roleIdByName.set(roleName, role.id);
    }

    const allRolePermissionRows = Object.entries(DEFAULT_ROLES).flatMap(([roleName, permCodes]) => {
      const roleId = roleIdByName.get(roleName)!;
      const codes = permCodes === "all" ? [...permissionByCode.keys()] : permCodes;
      return codes
        .map((code) => permissionByCode.get(code))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => ({ roleId, permissionId: p.id }));
    });

    if (allRolePermissionRows.length > 0) {
      await tx.rolePermission.createMany({ data: allRolePermissionRows });
    }

    const ownerRoleId = roleIdByName.get("Owner")!;

    const owner = await tx.user.create({
      data: {
        companyId: company.id,
        name: input.ownerName,
        email,
        phone: input.phone,
        passwordHash,
        roleId: ownerRoleId,
        isOwner: true,
      },
    });

    const warehouse = await tx.warehouse.create({
      data: { companyId: company.id, code: "MAIN", name: "المخزن الرئيسي", isDefault: true },
    });

    await tx.cashBox.create({
      data: { companyId: company.id, name: "الخزينة الرئيسية", type: "cash", isDefault: true },
    });

    await tx.documentSequence.createMany({
      data: DOCUMENT_SEQUENCES.map(([docType, prefix]) => ({
        companyId: company.id,
        docType,
        prefix,
        yearInNumber: true,
        padLength: 6,
        nextNumber: 1,
      })),
    });

    await tx.subscription.create({
      data: {
        companyId: company.id,
        planId: trialPlan.id,
        status: "TRIALING",
        trialStart: now,
        trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: company.id,
        userId: owner.id,
        action: "create",
        module: "company",
        tableName: "companies",
        recordId: company.id,
        newValue: { name: company.name, email: company.email },
      },
    });

    return { companyId: company.id, userId: owner.id, warehouseId: warehouse.id };
  }, { timeout: 20000, maxWait: 10000 });
}
