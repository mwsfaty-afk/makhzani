import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { TransferForm } from "./transfer-form";

export default async function NewTransferPage() {
  const { db } = await requireTenant();

  const [warehouses, items] = await Promise.all([
    db.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.item.findMany({ where: { isActive: true }, orderBy: { nameAr: "asc" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link
        href="/dashboard/inventory/transfers"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        التحويلات
      </Link>
      <h1 className="text-2xl font-bold">تحويل مخزني جديد</h1>

      <TransferForm
        warehouses={warehouses.map((w) => ({ id: w.id, label: w.name }))}
        items={items.map((i) => ({ id: i.id, label: `${i.nameAr ?? i.name} (${i.code})` }))}
      />
    </div>
  );
}
