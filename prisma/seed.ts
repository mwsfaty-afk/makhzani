import { PrismaClient } from "@prisma/client";
import { buildPermissionCatalog } from "../src/lib/permissions/catalog";

const prisma = new PrismaClient();

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
