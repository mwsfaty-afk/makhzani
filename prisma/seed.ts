import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { buildPermissionCatalog } from "../src/lib/permissions/catalog";

const prisma = new PrismaClient();

const PAID_PLANS: Array<{
  code: string;
  name: string;
  nameAr: string;
  description: string;
  price: number;
  maxUsers: number;
  maxBranches: number;
  maxWarehouses: number;
  maxItems: number;
  maxCustomers: number;
  maxSuppliers: number;
  maxMonthlyDocuments: number;
  maxStorageMb: number;
  sortOrder: number;
  prices: Array<{ countryCode: string; currency: string; price: number }>;
}> = [
  {
    code: "basic",
    name: "Basic",
    nameAr: "الأساسية",
    description: "للشركات الصغيرة التي تبدأ رحلتها في إدارة المخزون والمبيعات",
    price: 499,
    maxUsers: 5,
    maxBranches: 2,
    maxWarehouses: 3,
    maxItems: 1000,
    maxCustomers: 1000,
    maxSuppliers: 500,
    maxMonthlyDocuments: 500,
    maxStorageMb: 1000,
    sortOrder: 1,
    prices: [
      { countryCode: "SA", currency: "SAR", price: 149 },
      { countryCode: "EG", currency: "EGP", price: 499 },
    ],
  },
  {
    code: "professional",
    name: "Professional",
    nameAr: "الاحترافية",
    description: "للشركات المتنامية التي تحتاج مستخدمين وفروع أكثر وحدود أعلى",
    price: 1199,
    maxUsers: 15,
    maxBranches: 5,
    maxWarehouses: 10,
    maxItems: 10000,
    maxCustomers: 10000,
    maxSuppliers: 5000,
    maxMonthlyDocuments: 3000,
    maxStorageMb: 5000,
    sortOrder: 2,
    prices: [
      { countryCode: "SA", currency: "SAR", price: 349 },
      { countryCode: "EG", currency: "EGP", price: 1199 },
    ],
  },
  {
    code: "enterprise",
    name: "Enterprise",
    nameAr: "المؤسسية",
    description: "للمؤسسات الكبيرة متعددة الفروع بلا حدود عملية تقريبًا",
    price: 2999,
    maxUsers: 50,
    maxBranches: 20,
    maxWarehouses: 30,
    maxItems: 100000,
    maxCustomers: 100000,
    maxSuppliers: 50000,
    maxMonthlyDocuments: 20000,
    maxStorageMb: 20000,
    sortOrder: 3,
    prices: [
      { countryCode: "SA", currency: "SAR", price: 799 },
      { countryCode: "EG", currency: "EGP", price: 2999 },
    ],
  },
];

async function main() {
  const catalog = buildPermissionCatalog();
  for (const perm of catalog) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { module: perm.module, action: perm.action, label: perm.label, labelAr: perm.labelAr },
      create: perm,
    });
  }
  console.log(`Permissions seeded: ${catalog.length}`);

  await prisma.plan.upsert({
    where: { code: "trial" },
    update: {},
    create: {
      code: "trial",
      name: "Free Trial",
      nameAr: "الفترة التجريبية",
      description: "14 يومًا مجانًا للتعرف على النظام",
      price: 0,
      currency: "EGP",
      durationDays: 14,
      isTrial: true,
      isActive: true,
      isPublic: true,
      maxUsers: 2,
      maxBranches: 1,
      maxWarehouses: 1,
      maxItems: 100,
      maxCustomers: 100,
      maxSuppliers: 50,
      maxMonthlyDocuments: 100,
      maxStorageMb: 100,
      sortOrder: 0,
    },
  });
  console.log("Trial plan seeded");

  for (const p of PAID_PLANS) {
    const plan = await prisma.plan.upsert({
      where: { code: p.code },
      update: {},
      create: {
        code: p.code,
        name: p.name,
        nameAr: p.nameAr,
        description: p.description,
        price: p.price,
        currency: "EGP",
        durationDays: 30,
        isTrial: false,
        isActive: true,
        isPublic: true,
        maxUsers: p.maxUsers,
        maxBranches: p.maxBranches,
        maxWarehouses: p.maxWarehouses,
        maxItems: p.maxItems,
        maxCustomers: p.maxCustomers,
        maxSuppliers: p.maxSuppliers,
        maxMonthlyDocuments: p.maxMonthlyDocuments,
        maxStorageMb: p.maxStorageMb,
        sortOrder: p.sortOrder,
      },
    });

    for (const price of p.prices) {
      await prisma.planPrice.upsert({
        where: { planId_countryCode: { planId: plan.id, countryCode: price.countryCode } },
        update: { currency: price.currency, price: price.price },
        create: { planId: plan.id, countryCode: price.countryCode, currency: price.currency, price: price.price },
      });
    }
  }
  console.log(`Paid plans seeded: ${PAID_PLANS.map((p) => p.code).join(", ")}`);

  const adminEmail = "admin@makhzani.app";
  const adminPasswordHash = await bcrypt.hash("Admin123!", 12);
  await prisma.platformAdmin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Makhzani Admin",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      isSuperAdmin: true,
    },
  });
  console.log(`Platform admin seeded: ${adminEmail}`);
  console.log(
    "\n⚠️  SECURITY: this account uses a well-known development password (Admin123!).\n" +
      "   Before going to production, run:\n" +
      "   npx tsx scripts/change-admin-password.ts admin@makhzani.app '<a strong password>'\n",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
