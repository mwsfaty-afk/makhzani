import { prisma } from "./prisma";

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
          if (TENANT_MODELS.has(model)) args.where = withCompany(args.where, companyId);
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (TENANT_MODELS.has(model)) args.where = withCompany(args.where, companyId);
          return query(args);
        },
        async delete({ model, args, query }) {
          if (TENANT_MODELS.has(model)) args.where = withCompany(args.where, companyId);
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (TENANT_MODELS.has(model)) args.where = withCompany(args.where, companyId);
          return query(args);
        },
        async upsert({ model, args, query }) {
          if (TENANT_MODELS.has(model)) {
            args.where = withCompany(args.where, companyId);
            (args as { create: object }).create = { ...args.create, companyId };
          }
          return query(args);
        },
        async create({ model, args, query }) {
          if (TENANT_MODELS.has(model)) {
            (args as { data: object }).data = { ...args.data, companyId };
          }
          return query(args);
        },
        async createMany({ model, args, query }) {
          if (TENANT_MODELS.has(model) && Array.isArray(args.data)) {
            (args as { data: object[] }).data = args.data.map((row: object) => ({ ...row, companyId }));
          }
          return query(args);
        },
      },
    },
  });
}

export type TenantPrisma = ReturnType<typeof tenantPrisma>;
