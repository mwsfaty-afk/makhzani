/**
 * ينشئ شركة تجريبية كاملة البيانات (أصناف، مخازن، عملاء، موردون، أوامر توريد/صرف،
 * مشتريات، مبيعات) لاستخدامها في تسجيل فيديوهات شرح المنصة — كل عملية تمر عبر نفس
 * دوال الخدمة الحقيقية المستخدَمة في الواجهة فعليًا (createSale/postSale...)، وليس إدخالًا
 * مباشرًا في قاعدة البيانات، حتى تُحسب الأرصدة ومتوسط التكلفة والتقارير بشكل صحيح فعليًا.
 *
 * الاستخدام: npx tsx scripts/seed-demo-company.ts
 */
import { prisma } from "../src/lib/db/prisma";
import { registerCompany } from "../src/lib/services/billing/registerCompany";
import { createStockOrder } from "../src/lib/services/inventory/createStockOrder";
import { postStockOrder } from "../src/lib/services/inventory/postStockOrder";
import { createPurchase } from "../src/lib/services/purchases/createPurchase";
import { postPurchase } from "../src/lib/services/purchases/postPurchase";
import { createSale } from "../src/lib/services/sales/createSale";
import { postSale } from "../src/lib/services/sales/postSale";

const DEMO_EMAIL = "demo@mkhzny.com";
const DEMO_PASSWORD = "Demo@2026!";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    throw new Error(`الحساب ${DEMO_EMAIL} موجود بالفعل — احذفه أولًا لو عايز تعيد الإنشاء من الصفر`);
  }

  console.log("1) إنشاء الشركة...");
  const { companyId, userId, warehouseId: mainWarehouseId } = await registerCompany({
    companyName: "مؤسسة الأمين للتجارة والتوزيع",
    ownerName: "أحمد المصري",
    email: DEMO_EMAIL,
    phone: "01012345678",
    password: DEMO_PASSWORD,
    country: "EG",
  });
  console.log(`   تم — companyId=${companyId}`);

  console.log("2) إضافة مخزن ثانٍ (فرع أكتوبر)...");
  const branchWarehouse = await prisma.warehouse.create({
    data: { companyId, code: "OCT", name: "فرع 6 أكتوبر", isDefault: false },
  });

  console.log("3) الوحدات...");
  const pieceUnit = await prisma.unit.create({ data: { companyId, name: "Piece", nameAr: "قطعة" } as never });
  const cartonUnit = await prisma.unit.create({ data: { companyId, name: "Carton", nameAr: "كرتونة" } as never });

  console.log("4) المجموعات والعلامات التجارية...");
  const [catFood, catCleaning, catDrinks] = await Promise.all([
    prisma.category.create({ data: { companyId, name: "مواد غذائية" } as never }),
    prisma.category.create({ data: { companyId, name: "منظفات ومستلزمات منزلية" } as never }),
    prisma.category.create({ data: { companyId, name: "مشروبات" } as never }),
  ]);
  const [brandAbuKas, brandAfia, brandFairy, brandBaraka, brandJuhayna] = await Promise.all([
    prisma.brand.create({ data: { companyId, name: "أبو كاس" } as never }),
    prisma.brand.create({ data: { companyId, name: "عافية" } as never }),
    prisma.brand.create({ data: { companyId, name: "فيري" } as never }),
    prisma.brand.create({ data: { companyId, name: "بركة" } as never }),
    prisma.brand.create({ data: { companyId, name: "جهينة" } as never }),
  ]);

  console.log("5) الأصناف...");
  const itemDefs = [
    { code: "ITM-001", nameAr: "أرز أبو كاس 5 كجم", name: "Rice 5kg", categoryId: catFood.id, brandId: brandAbuKas.id, cartonFactor: 6, purchasePrice: 180, salePrice: 220 },
    { code: "ITM-002", nameAr: "زيت عافية 1 لتر", name: "Cooking Oil 1L", categoryId: catFood.id, brandId: brandAfia.id, cartonFactor: 12, purchasePrice: 45, salePrice: 58 },
    { code: "ITM-003", nameAr: "سكر مصري 1 كجم", name: "Sugar 1kg", categoryId: catFood.id, brandId: null, cartonFactor: 10, purchasePrice: 28, salePrice: 35 },
    { code: "ITM-004", nameAr: "معجون طماطم", name: "Tomato Paste", categoryId: catFood.id, brandId: null, cartonFactor: 24, purchasePrice: 8, salePrice: 12 },
    { code: "ITM-005", nameAr: "منظف أطباق فيري 750مل", name: "Dish Soap 750ml", categoryId: catCleaning.id, brandId: brandFairy.id, cartonFactor: 12, purchasePrice: 32, salePrice: 42 },
    { code: "ITM-006", nameAr: "صابون غسيل", name: "Laundry Soap", categoryId: catCleaning.id, brandId: null, cartonFactor: 20, purchasePrice: 15, salePrice: 20 },
    { code: "ITM-007", nameAr: "مياه بركة 1.5 لتر", name: "Mineral Water 1.5L", categoryId: catDrinks.id, brandId: brandBaraka.id, cartonFactor: 6, purchasePrice: 9, salePrice: 13 },
    { code: "ITM-008", nameAr: "عصير جهينة 1 لتر", name: "Juice 1L", categoryId: catDrinks.id, brandId: brandJuhayna.id, cartonFactor: 12, purchasePrice: 18, salePrice: 25 },
  ];

  const items: Record<string, { id: number; cartonFactor: number; purchasePrice: number; salePrice: number }> = {};
  for (const d of itemDefs) {
    const item = await prisma.item.create({
      data: {
        companyId,
        code: d.code,
        name: d.name,
        nameAr: d.nameAr,
        categoryId: d.categoryId,
        brandId: d.brandId ?? undefined,
        baseUnitId: pieceUnit.id,
        purchaseUnitId: cartonUnit.id,
        salesUnitId: pieceUnit.id,
        purchaseUnitFactor: d.cartonFactor,
        salesUnitFactor: 1,
        purchasePrice: d.purchasePrice,
        salePrice: d.salePrice,
        minStock: 10,
        maxStock: 1000,
        reorderPoint: 20,
      } as never,
    });
    items[d.code] = { id: item.id, cartonFactor: d.cartonFactor, purchasePrice: d.purchasePrice, salePrice: d.salePrice };
  }

  console.log("6) العملاء والموردون...");
  const customers = await Promise.all([
    prisma.customer.create({ data: { companyId, code: "CUS-001", name: "محمد عبد الله", phone: "01111111111", creditLimit: 5000, openingBalance: 0 } as never }),
    prisma.customer.create({ data: { companyId, code: "CUS-002", name: "سوبر ماركت الأمل", phone: "01222222222", creditLimit: 15000, openingBalance: 0 } as never }),
    prisma.customer.create({ data: { companyId, code: "CUS-003", name: "بقالة الحي", phone: "01333333333", creditLimit: 3000, openingBalance: 0 } as never }),
  ]);
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { companyId, code: "SUP-001", name: "شركة أبو كاس للمواد الغذائية", phone: "0221111111" } as never }),
    prisma.supplier.create({ data: { companyId, code: "SUP-002", name: "مؤسسة عافية للزيوت", phone: "0222222222" } as never }),
    prisma.supplier.create({ data: { companyId, code: "SUP-003", name: "شركة فيري للتوزيع", phone: "0223333333" } as never }),
  ]);

  console.log("7) إيداع رأس مال أولي (حتى لا يبدأ رصيد الخزينة سالبًا قبل أول تحصيل)...");
  const mainCashBox = await prisma.cashBox.findFirstOrThrow({ where: { companyId, isDefault: true } });
  await prisma.cashTransaction.create({
    data: {
      companyId,
      cashBoxId: mainCashBox.id,
      type: "RECEIPT",
      amount: 30000,
      direction: "IN",
      date: daysAgo(21),
      documentType: "receipt",
      userId,
      notes: "رأس مال أولي لبدء النشاط",
    },
  });

  console.log("8) أوامر التوريد والصرف...");
  // أمر توريد (رصيد افتتاحي) — كل الأصناف بكميات أولية في المخزن الرئيسي
  const openingOrder = await createStockOrder({
    companyId,
    warehouseId: mainWarehouseId,
    direction: "IN",
    reason: "opening",
    date: daysAgo(20),
    notes: "رصيد افتتاحي عند بدء التشغيل على مخزني",
    userId,
    lines: Object.values(items).map((it) => ({ itemId: it.id, qty: 30, unitCost: it.purchasePrice })),
  });
  await postStockOrder(companyId, openingOrder.id, userId);

  // أمر صرف (تلف) — كمية بسيطة من صنفين
  const damageOrder = await createStockOrder({
    companyId,
    warehouseId: mainWarehouseId,
    direction: "OUT",
    reason: "damage",
    date: daysAgo(14),
    notes: "تلف أثناء النقل",
    userId,
    lines: [
      { itemId: items["ITM-003"].id, qty: 4 },
      { itemId: items["ITM-007"].id, qty: 6 },
    ],
  });
  await postStockOrder(companyId, damageOrder.id, userId);

  // أمر توريد ثانٍ (تسوية) لتغذية فرع أكتوبر
  const branchOpeningOrder = await createStockOrder({
    companyId,
    warehouseId: branchWarehouse.id,
    direction: "IN",
    reason: "opening",
    date: daysAgo(13),
    notes: "رصيد افتتاحي — فرع 6 أكتوبر",
    userId,
    lines: [
      { itemId: items["ITM-001"].id, qty: 12, unitCost: items["ITM-001"].purchasePrice },
      { itemId: items["ITM-002"].id, qty: 24, unitCost: items["ITM-002"].purchasePrice },
      { itemId: items["ITM-007"].id, qty: 18, unitCost: items["ITM-007"].purchasePrice },
    ],
  });
  await postStockOrder(companyId, branchOpeningOrder.id, userId);

  console.log("9) فواتير المشتريات...");
  const purchasePlans = [
    { supplierId: suppliers[0].id, date: daysAgo(18), paid: true, lines: [{ code: "ITM-001", qty: 8 }, { code: "ITM-004", qty: 5 }] },
    { supplierId: suppliers[1].id, date: daysAgo(15), paid: true, lines: [{ code: "ITM-002", qty: 10 }, { code: "ITM-003", qty: 6 }] },
    { supplierId: suppliers[2].id, date: daysAgo(10), paid: false, lines: [{ code: "ITM-005", qty: 8 }, { code: "ITM-006", qty: 6 }] },
    { supplierId: suppliers[0].id, date: daysAgo(4), paid: true, lines: [{ code: "ITM-007", qty: 10 }, { code: "ITM-008", qty: 8 }] },
  ];
  for (const plan of purchasePlans) {
    const lines = plan.lines.map((l) => ({
      itemId: items[l.code].id,
      unitId: cartonUnit.id,
      qty: l.qty,
      unitPrice: items[l.code].purchasePrice * items[l.code].cartonFactor,
      taxRate: 0,
    }));
    const grandTotal = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
    const purchase = await createPurchase({
      companyId,
      supplierId: plan.supplierId,
      warehouseId: mainWarehouseId,
      date: plan.date,
      paymentMethod: plan.paid ? "cash" : undefined,
      paidAmount: plan.paid ? grandTotal : 0,
      userId,
      lines,
    });
    await postPurchase(companyId, purchase.id, userId);
  }

  console.log("10) فواتير المبيعات...");
  const salePlans: { customerId: number; date: Date; paidRatio: number; draft?: boolean; lines: { code: string; qty: number }[] }[] = [
    { customerId: customers[0].id, date: daysAgo(16), paidRatio: 1, lines: [{ code: "ITM-001", qty: 3 }, { code: "ITM-007", qty: 6 }] },
    { customerId: customers[1].id, date: daysAgo(13), paidRatio: 0.5, lines: [{ code: "ITM-002", qty: 5 }, { code: "ITM-005", qty: 4 }] },
    { customerId: customers[2].id, date: daysAgo(11), paidRatio: 1, lines: [{ code: "ITM-003", qty: 4 }, { code: "ITM-008", qty: 3 }] },
    { customerId: customers[0].id, date: daysAgo(8), paidRatio: 0, lines: [{ code: "ITM-004", qty: 6 }, { code: "ITM-006", qty: 3 }] },
    { customerId: customers[1].id, date: daysAgo(6), paidRatio: 1, lines: [{ code: "ITM-001", qty: 2 }, { code: "ITM-002", qty: 3 }] },
    { customerId: customers[2].id, date: daysAgo(3), paidRatio: 0.7, lines: [{ code: "ITM-007", qty: 8 }, { code: "ITM-008", qty: 4 }] },
    { customerId: customers[1].id, date: daysAgo(1), paidRatio: 1, lines: [{ code: "ITM-005", qty: 3 }, { code: "ITM-003", qty: 2 }] },
    { customerId: customers[0].id, date: daysAgo(0), paidRatio: 0, draft: true, lines: [{ code: "ITM-001", qty: 1 }, { code: "ITM-007", qty: 2 }] },
  ];

  for (const plan of salePlans) {
    const lines = plan.lines.map((l) => ({
      itemId: items[l.code].id,
      unitId: pieceUnit.id,
      qty: l.qty,
      unitPrice: items[l.code].salePrice,
      taxRate: 0,
    }));
    const grandTotal = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
    const sale = await createSale({
      companyId,
      customerId: plan.customerId,
      warehouseId: mainWarehouseId,
      date: plan.date,
      paymentMethod: plan.paidRatio > 0 ? "cash" : undefined,
      paidAmount: Math.round(grandTotal * plan.paidRatio),
      userId,
      lines,
    });
    if (!plan.draft) {
      await postSale(companyId, sale.id, userId);
    }
  }

  console.log("\n✅ تم إنشاء الشركة التجريبية بنجاح:");
  console.log(`   الرابط: https://mkhzny.com/login`);
  console.log(`   البريد الإلكتروني: ${DEMO_EMAIL}`);
  console.log(`   كلمة المرور: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("فشل السكربت:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
