import { prisma } from "./prisma";
import { assertSubscriptionActive } from "@/lib/services/billing/subscriptionGuard";
import { enforceCountLimit, isCountableModel, toCountableModelKey } from "@/lib/services/billing/enforceLimit";

/**
 * كل جدول فيه companyId مباشرة (وليس عبر جدول أب فقط). جداول تفاصيل المستندات
 * (مثل PurchaseItem, SaleItem, WarehouseLocation...) مستثناة عمدًا — عزلها يتم عبر
 * الجدول الأب (Purchase, Sale, Warehouse...) الذي يحمل companyId فعليًا.
 */
const TENANT_MODELS = new Set([
  "User",
  "Role",
  "UserPermission",
  "UserWarehouse",
  "Branch",
  "Warehouse",
  "Category",
  "Brand",
  "Unit",
  "Item",
  "Customer",
  "Supplier",
  "PurchaseOrder",
  "Purchase",
  "PurchaseReturn",
  "SalesOrder",
  "Sale",
  "SaleReturn",
  "StockMovement",
  "StockBalance",
  "StockAdjustment",
  "StockTransfer",
  "StockTake",
  "CashBox",
  "CashTransaction",
  "CustomerTransaction",
  "SupplierTransaction",
  "Notification",
  "AuditLog",
  "Setting",
  "DocumentSequence",
]);

function withCompany(where: unknown, companyId: number) {
  return { ...(where as object | undefined), companyId };
}

/** يُستدعى قبل أي كتابة (تعديل/حذف) على جدول tenant — يمنع أي تعديل إن انتهت صلاحية
 * الاشتراك (بند 8.5 في docs/ARCHITECTURE.md)، بصرف النظر عن نوع العملية. */
async function beforeWrite(model: string, companyId: number) {
  if (TENANT_MODELS.has(model)) await assertSubscriptionActive(companyId);
}

/** يُستدعى قبل إنشاء صف جديد — يفرض نفس فحص صلاحية الاشتراك، وإضافةً لذلك حد الخطة
 * الكمّي (maxItems/maxCustomers/...) للجداول المحدودة (بند 47). */
async function beforeCreate(model: string, companyId: number) {
  if (!TENANT_MODELS.has(model)) return;
  await assertSubscriptionActive(companyId);
  if (isCountableModel(model)) await enforceCountLimit(toCountableModelKey(model), companyId);
}

/**
 * عميل Prisma مقيّد بشركة واحدة فقط. هذا هو المدخل الوحيد المسموح به للوصول للبيانات
 * من داخل lib/services — لا يُستدعى prisma الخام مباشرة لأي جدول tenant (بند 3 في
 * docs/ARCHITECTURE.md). كل عملية على جدول تابع لشركة تُفرَض عليها companyId تلقائيًا،
 * حتى لو نسي المطوّر كتابتها يدويًا في where/data.
 */
export function tenantPrisma(companyId: number) {
  return prisma.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async findFirst({ model, args, query }) {
          if (TENANT_MODELS.has(model)) args.where = withCompany(args.where, companyId);
          return query(args);
        },
        async findFirstOrThrow({ model, args, query }) {
          if (TENANT_MODELS.has(model)) args.where = withCompany(args.where, companyId);
          return query(args);
        },
        async findUnique({ model, args, query }) {
          if (TENANT_MODELS.has(model)) args.where = withCompany(args.where, companyId);
          return query(args);
        },
        async findUniqueOrThrow({ model, args, query }) {
          if (TENANT_MODELS.has(model)) args.where = withCompany(args.where, companyId);
          return query(args);
        },
        async findMany({ model, args, query }) {
          if (TENANT_MODELS.has(model)) args.where = withCompany(args.where, companyId);
          return query(args);
        },
        async count({ model, args, query }) {
          if (TENANT_MODELS.has(model)) args.where = withCompany(args.where, companyId);
          return query(args);
        },
        async update({ model, args, query }) {
          if (TENANT_MODELS.has(model)) {
            await beforeWrite(model, companyId);
            args.where = withCompany(args.where, companyId);
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (TENANT_MODELS.has(model)) {
            await beforeWrite(model, companyId);
            args.where = withCompany(args.where, companyId);
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          if (TENANT_MODELS.has(model)) {
            await beforeWrite(model, companyId);
            args.where = withCompany(args.where, companyId);
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (TENANT_MODELS.has(model)) {
            await beforeWrite(model, companyId);
            args.where = withCompany(args.where, companyId);
          }
          return query(args);
        },
        async upsert({ model, args, query }) {
          if (TENANT_MODELS.has(model)) {
            await beforeCreate(model, companyId);
            args.where = withCompany(args.where, companyId);
            (args as { create: object }).create = { ...args.create, companyId };
          }
          return query(args);
        },
        async create({ model, args, query }) {
          if (TENANT_MODELS.has(model)) {
            await beforeCreate(model, companyId);
            (args as { data: object }).data = { ...args.data, companyId };
          }
          return query(args);
        },
        async createMany({ model, args, query }) {
          if (TENANT_MODELS.has(model) && Array.isArray(args.data)) {
            await beforeCreate(model, companyId);
            (args as { data: object[] }).data = args.data.map((row: object) => ({ ...row, companyId }));
          }
          return query(args);
        },
      },
    },
  });
}

export type TenantPrisma = ReturnType<typeof tenantPrisma>;
