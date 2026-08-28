import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { PurchaseForm } from "./purchase-form";

export default async function NewPurchasePage() {
  const { db, companyId } = await requireTenant();

  const [suppliers, warehouses, items, company] = await Promise.all([
    db.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.item.findMany({
      where: { isActive: true },
      include: { baseUnit: true, purchaseUnit: true },
      orderBy: { nameAr: "asc" },
    }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { taxEnabled: true } }),
  ]);

  if (suppliers.length === 0) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="mb-4 text-sm text-muted-foreground">يجب إضافة مورد واحد على الأقل قبل إنشاء فاتورة شراء.</p>
        <Button render={<Link href="/dashboard/suppliers" />}>إدارة الموردين</Button>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="mb-4 text-sm text-muted-foreground">يجب إضافة صنف واحد على الأقل قبل إنشاء فاتورة شراء.</p>
        <Button render={<Link href="/dashboard/inventory/items/new" />}>إضافة صنف</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link
        href="/dashboard/purchases"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        المشتريات
      </Link>
      <h1 className="text-2xl font-bold">فاتورة شراء جديدة</h1>

      <PurchaseForm
        suppliers={suppliers.map((s) => ({ id: s.id, label: `${s.name} (${s.code})` }))}
        warehouses={warehouses.map((w) => ({ id: w.id, label: w.name }))}
        items={items.map((i) => ({
          id: i.id,
          label: `${i.nameAr ?? i.name} (${i.code})`,
          baseUnitId: i.baseUnitId,
          baseUnitLabel: i.baseUnit.nameAr,
          purchaseUnitId: i.purchaseUnitId,
          purchaseUnitLabel: i.purchaseUnit?.nameAr ?? null,
          purchaseUnitFactor: Number(i.purchaseUnitFactor),
          purchasePrice: Number(i.purchasePrice),
          taxRate: Number(i.taxRate),
        }))}
        taxEnabled={company.taxEnabled}
      />
    </div>
  );
}
