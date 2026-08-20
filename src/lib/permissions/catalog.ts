/**
 * كتالوج الصلاحيات — مصدر واحد للحقيقة يُستخدم في seed قاعدة البيانات وفي فحوصات
 * الصلاحيات بالكود. أي وحدة جديدة تُضاف هنا فقط، لا تُكتب أكواد صلاحيات حرة متفرقة
 * في باقي المشروع (docs/ARCHITECTURE.md §7).
 */

export const ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "print",
  "approve",
  "cancel",
  "export",
] as const;

const ACTION_LABELS_AR: Record<(typeof ACTIONS)[number], string> = {
  view: "عرض",
  create: "إنشاء",
  edit: "تعديل",
  delete: "حذف",
  print: "طباعة",
  approve: "اعتماد",
  cancel: "إلغاء",
  export: "تصدير",
};

export const MODULES = [
  { code: "items", label: "Items", labelAr: "الأصناف" },
  { code: "categories", label: "Categories", labelAr: "المجموعات" },
  { code: "brands", label: "Brands", labelAr: "العلامات التجارية" },
  { code: "units", label: "Units", labelAr: "الوحدات" },
  { code: "warehouses", label: "Warehouses", labelAr: "المخازن" },
  { code: "customers", label: "Customers", labelAr: "العملاء" },
  { code: "suppliers", label: "Suppliers", labelAr: "الموردون" },
  { code: "purchases", label: "Purchases", labelAr: "المشتريات" },
  { code: "purchase_returns", label: "Purchase Returns", labelAr: "مرتجع المشتريات" },
  { code: "sales", label: "Sales", labelAr: "المبيعات" },
  { code: "sale_returns", label: "Sale Returns", labelAr: "مرتجع المبيعات" },
  { code: "stock_transfers", label: "Stock Transfers", labelAr: "التحويلات المخزنية" },
  { code: "stock_adjustments", label: "Stock Adjustments", labelAr: "تسويات المخزون" },
  { code: "stock_takes", label: "Stock Takes", labelAr: "الجرد" },
  { code: "cash", label: "Cash", labelAr: "الخزينة" },
  { code: "reports", label: "Reports", labelAr: "التقارير" },
  { code: "users", label: "Users", labelAr: "المستخدمون" },
  { code: "settings", label: "Settings", labelAr: "الإعدادات" },
] as const;

export type ModuleCode = (typeof MODULES)[number]["code"];

/** صلاحيات حساسة لا تتبع نمط module.action القياسي (بند 37) */
export const SPECIAL_PERMISSIONS = [
  { code: "stock.view_cost", label: "View Cost", labelAr: "رؤية التكلفة" },
  { code: "stock.view_profit", label: "View Profit", labelAr: "رؤية الربح" },
  { code: "items.change_price", label: "Change Price", labelAr: "تغيير الأسعار" },
  { code: "stock.allow_negative_stock", label: "Allow Negative Stock", labelAr: "السماح بمخزون سالب" },
] as const;

export function modulePermissionCode(moduleCode: string, action: string) {
  return `${moduleCode}.${action}`;
}

export function buildPermissionCatalog() {
  const rows: { code: string; module: string; action: string; label: string; labelAr: string }[] = [];
  for (const mod of MODULES) {
    for (const action of ACTIONS) {
      rows.push({
        code: modulePermissionCode(mod.code, action),
        module: mod.code,
        action,
        label: `${mod.label} · ${action}`,
        labelAr: `${mod.labelAr} - ${ACTION_LABELS_AR[action]}`,
      });
    }
  }
  for (const special of SPECIAL_PERMISSIONS) {
    const [module] = special.code.split(".");
    rows.push({
      code: special.code,
      module,
      action: special.code.split(".")[1],
      label: special.label,
      labelAr: special.labelAr,
    });
  }
  return rows;
}

/** أدوار البداية الافتراضية عند تسجيل شركة جديدة (بند 36، §7.2) — قابلة للتعديل الكامل لاحقًا لكل شركة */
export const DEFAULT_ROLES = {
  Owner: "all",
  Admin: "all",
  Accountant: [
    "stock.view_cost",
    "stock.view_profit",
    modulePermissionCode("cash", "view"),
    modulePermissionCode("cash", "create"),
    modulePermissionCode("cash", "edit"),
    modulePermissionCode("customers", "view"),
    modulePermissionCode("suppliers", "view"),
    modulePermissionCode("purchases", "view"),
    modulePermissionCode("sales", "view"),
    modulePermissionCode("reports", "view"),
    modulePermissionCode("reports", "export"),
  ],
  "Warehouse Manager": [
    "stock.view_cost",
    modulePermissionCode("items", "view"),
    modulePermissionCode("items", "create"),
    modulePermissionCode("items", "edit"),
    modulePermissionCode("warehouses", "view"),
    modulePermissionCode("warehouses", "create"),
    modulePermissionCode("warehouses", "edit"),
    modulePermissionCode("purchases", "view"),
    modulePermissionCode("purchases", "create"),
    modulePermissionCode("stock_transfers", "view"),
    modulePermissionCode("stock_transfers", "create"),
    modulePermissionCode("stock_transfers", "approve"),
    modulePermissionCode("stock_adjustments", "view"),
    modulePermissionCode("stock_adjustments", "create"),
    modulePermissionCode("stock_adjustments", "approve"),
    modulePermissionCode("stock_takes", "view"),
    modulePermissionCode("stock_takes", "create"),
    modulePermissionCode("stock_takes", "approve"),
    modulePermissionCode("reports", "view"),
  ],
  Storekeeper: [
    modulePermissionCode("items", "view"),
    modulePermissionCode("warehouses", "view"),
    modulePermissionCode("stock_transfers", "view"),
    modulePermissionCode("stock_transfers", "create"),
    modulePermissionCode("stock_adjustments", "view"),
    modulePermissionCode("stock_adjustments", "create"),
    modulePermissionCode("stock_takes", "view"),
    modulePermissionCode("stock_takes", "create"),
  ],
  Sales: [
    modulePermissionCode("items", "view"),
    modulePermissionCode("customers", "view"),
    modulePermissionCode("customers", "create"),
    modulePermissionCode("sales", "view"),
    modulePermissionCode("sales", "create"),
    modulePermissionCode("sales", "print"),
    modulePermissionCode("sale_returns", "view"),
    modulePermissionCode("sale_returns", "create"),
  ],
  Cashier: [
    modulePermissionCode("customers", "view"),
    modulePermissionCode("sales", "view"),
    modulePermissionCode("sales", "create"),
    modulePermissionCode("sales", "print"),
    modulePermissionCode("cash", "view"),
    modulePermissionCode("cash", "create"),
  ],
  Viewer: [
    modulePermissionCode("items", "view"),
    modulePermissionCode("customers", "view"),
    modulePermissionCode("suppliers", "view"),
    modulePermissionCode("purchases", "view"),
    modulePermissionCode("sales", "view"),
    modulePermissionCode("reports", "view"),
  ],
} as const satisfies Record<string, "all" | string[]>;
