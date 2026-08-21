import { prisma } from "@/lib/db/prisma";
import { registerCompany, type RegisterCompanyInput } from "@/lib/services/billing/registerCompany";

/** بادئة ثابتة تُميّز كل بيانات الاختبار الآلي — لا تُستخدم أبدًا لشركات حقيقية، فتسمح
 * بحذف آمن ومحدد النطاق حتى لو فشل afterAll في تنظيف شركة من تشغيل سابق. */
export const TEST_COMPANY_PREFIX = "TEST_AUTOMATED_";

export function uniqueTestEmail(label: string) {
  return `${TEST_COMPANY_PREFIX.toLowerCase()}${label}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.test`;
}

export async function createTestCompany(overrides: Partial<RegisterCompanyInput> = {}) {
  const email = overrides.email ?? uniqueTestEmail("co");
  const result = await registerCompany({
    companyName: `${TEST_COMPANY_PREFIX}${Date.now()}`,
    ownerName: "Test Owner",
    email,
    password: "TestPassword123!",
    country: "SA",
    ...overrides,
  });
  return result; // { companyId, userId, warehouseId }
}

/** يحذف شركة اختبار وكل بياناتها التابعة بترتيب صحيح (من الأوراق نحو الجذر) — لا توجد
 * علاقات onDelete: Cascade في السكيمة الحالية (RESTRICT افتراضيًا)، فالحذف اليدوي المرتّب
 * إلزامي. لا يُستخدم هذا إطلاقًا خارج بيانات الاختبار (يتحقق من البادئة أولًا كحارس أمان). */
export async function deleteTestCompany(companyId: number) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return;
  if (!company.name.startsWith(TEST_COMPANY_PREFIX)) {
    throw new Error(`Refusing to delete non-test company (id=${companyId}, name="${company.name}")`);
  }

  const purchaseIds = (await prisma.purchase.findMany({ where: { companyId }, select: { id: true } })).map((r) => r.id);
  const saleIds = (await prisma.sale.findMany({ where: { companyId }, select: { id: true } })).map((r) => r.id);
  const purchaseReturnIds = (await prisma.purchaseReturn.findMany({ where: { companyId }, select: { id: true } })).map((r) => r.id);
  const saleReturnIds = (await prisma.saleReturn.findMany({ where: { companyId }, select: { id: true } })).map((r) => r.id);
  const transferIds = (await prisma.stockTransfer.findMany({ where: { companyId }, select: { id: true } })).map((r) => r.id);
  const adjustmentIds = (await prisma.stockAdjustment.findMany({ where: { companyId }, select: { id: true } })).map((r) => r.id);
  const stockTakeIds = (await prisma.stockTake.findMany({ where: { companyId }, select: { id: true } })).map((r) => r.id);
  const subscription = await prisma.subscription.findUnique({ where: { companyId } });

  // Callback-form $transaction (وليس صيغة المصفوفة) — صيغة المصفوفة لا تدعم خيار timeout
  // إطلاقًا (خطأ نوع حقيقي رصده npm run typecheck)، وهذا العدد الكبير من deleteMany
  // المتتالية على شركة اختبار كاملة يحتاج مهلة أطول من افتراضي Prisma (5 ثوانٍ) عبر
  // اتصال Supabase Ireland — نفس النمط المستخدم في كل مكان آخر بهذا المشروع.
  await prisma.$transaction(async (tx) => {
    await tx.purchaseItem.deleteMany({ where: { purchaseId: { in: purchaseIds } } });
    await tx.saleItem.deleteMany({ where: { saleId: { in: saleIds } } });
    await tx.purchaseReturnItem.deleteMany({ where: { purchaseReturnId: { in: purchaseReturnIds } } });
    await tx.saleReturnItem.deleteMany({ where: { saleReturnId: { in: saleReturnIds } } });
    await tx.stockTransferItem.deleteMany({ where: { stockTransferId: { in: transferIds } } });
    await tx.stockAdjustmentItem.deleteMany({ where: { stockAdjustmentId: { in: adjustmentIds } } });
    await tx.stockTakeItem.deleteMany({ where: { stockTakeId: { in: stockTakeIds } } });
    await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { companyId } } });
    await tx.salesOrderItem.deleteMany({ where: { salesOrder: { companyId } } });

    await tx.stockMovement.deleteMany({ where: { companyId } });
    await tx.customerTransaction.deleteMany({ where: { companyId } });
    await tx.supplierTransaction.deleteMany({ where: { companyId } });
    await tx.cashTransaction.deleteMany({ where: { companyId } });
    await tx.auditLog.deleteMany({ where: { companyId } });
    await tx.notification.deleteMany({ where: { companyId } });

    await tx.purchase.deleteMany({ where: { companyId } });
    await tx.sale.deleteMany({ where: { companyId } });
    await tx.purchaseReturn.deleteMany({ where: { companyId } });
    await tx.saleReturn.deleteMany({ where: { companyId } });
    await tx.stockTransfer.deleteMany({ where: { companyId } });
    await tx.stockAdjustment.deleteMany({ where: { companyId } });
    await tx.stockTake.deleteMany({ where: { companyId } });
    await tx.purchaseOrder.deleteMany({ where: { companyId } });
    await tx.salesOrder.deleteMany({ where: { companyId } });

    await tx.stockBalance.deleteMany({ where: { companyId } });

    if (subscription) await tx.payment.deleteMany({ where: { subscriptionId: subscription.id } });
    await tx.subscription.deleteMany({ where: { companyId } });

    await tx.userPermission.deleteMany({ where: { user: { companyId } } });
    await tx.userWarehouse.deleteMany({ where: { user: { companyId } } });
    await tx.rolePermission.deleteMany({ where: { role: { companyId } } });

    await tx.user.deleteMany({ where: { companyId } });
    await tx.role.deleteMany({ where: { companyId } });

    await tx.item.deleteMany({ where: { companyId } });
    await tx.customer.deleteMany({ where: { companyId } });
    await tx.supplier.deleteMany({ where: { companyId } });
    await tx.category.deleteMany({ where: { companyId } });
    await tx.brand.deleteMany({ where: { companyId } });
    await tx.unit.deleteMany({ where: { companyId } });
    await tx.warehouseLocation.deleteMany({ where: { warehouse: { companyId } } });
    await tx.warehouse.deleteMany({ where: { companyId } });
    await tx.branch.deleteMany({ where: { companyId } });
    await tx.cashBox.deleteMany({ where: { companyId } });

    await tx.documentSequence.deleteMany({ where: { companyId } });
    await tx.setting.deleteMany({ where: { companyId } });

    await tx.company.delete({ where: { id: companyId } });
  }, { timeout: 20000, maxWait: 10000 });
}
