import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { StockOrderForm } from "./stock-order-form";

export default async function NewStockOrderPage() {
  const { db } = await requireTenant();

  const [warehouses, items] = await Promise.all([
    db.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.item.findMany({
      where: { isActive: true },
      include: { baseUnit: true },
      orderBy: { nameAr: "asc" },
    }),
  ]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="mb-4 text-sm text-muted-foreground">يجب إضافة صنف واحد على الأقل قبل إنشاء أمر توريد/صرف.</p>
        <Button render={<Link href="/dashboard/inventory/items/new" />}>إضافة صنف</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link
        href="/dashboard/inventory/stock-orders"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        أوامر التوريد والصرف
      </Link>
      <h1 className="text-2xl font-bold">أمر توريد/صرف جديد</h1>

      <StockOrderForm
        warehouses={warehouses.map((w) => ({ id: w.id, label: w.name }))}
        items={items.map((i) => ({ id: i.id, label: `${i.nameAr ?? i.name} (${i.code})`, baseUnitLabel: i.baseUnit.nameAr }))}
      />
    </div>
  );
}
