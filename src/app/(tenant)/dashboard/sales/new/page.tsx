import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { SaleForm } from "./sale-form";

export default async function NewSalePage() {
  const { db, companyId } = await requireTenant();

  const [customers, warehouses, items, company] = await Promise.all([
    db.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.item.findMany({
      where: { isActive: true },
      include: { baseUnit: true, salesUnit: true },
      orderBy: { nameAr: "asc" },
    }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { taxEnabled: true } }),
  ]);

  if (customers.length === 0) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="mb-4 text-sm text-muted-foreground">يجب إضافة عميل واحد على الأقل قبل إنشاء فاتورة بيع.</p>
        <Button render={<Link href="/dashboard/customers" />}>إدارة العملاء</Button>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="mb-4 text-sm text-muted-foreground">يجب إضافة صنف واحد على الأقل قبل إنشاء فاتورة بيع.</p>
        <Button render={<Link href="/dashboard/inventory/items/new" />}>إضافة صنف</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link
        href="/dashboard/sales"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        المبيعات
      </Link>
      <h1 className="text-2xl font-bold">فاتورة بيع جديدة</h1>

      <SaleForm
        customers={customers.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` }))}
        warehouses={warehouses.map((w) => ({ id: w.id, label: w.name }))}
        items={items.map((i) => ({
          id: i.id,
          label: `${i.nameAr ?? i.name} (${i.code})`,
          baseUnitId: i.baseUnitId,
          baseUnitLabel: i.baseUnit.nameAr,
          salesUnitId: i.salesUnitId,
          salesUnitLabel: i.salesUnit?.nameAr ?? null,
          salesUnitFactor: Number(i.salesUnitFactor),
          salePrice: Number(i.salePrice),
          taxRate: Number(i.taxRate),
        }))}
        taxEnabled={company.taxEnabled}
      />
    </div>
  );
}
