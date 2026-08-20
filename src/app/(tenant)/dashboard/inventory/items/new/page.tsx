import Link from "next/link";
import { requireTenant } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { ItemForm } from "../item-form";

export default async function NewItemPage() {
  const { db } = await requireTenant();

  const [categories, brands, units] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
    db.unit.findMany({ orderBy: { nameAr: "asc" } }),
  ]);

  if (units.length === 0) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="mb-4 text-sm text-muted-foreground">
          يجب إضافة وحدة واحدة على الأقل (مثل: قطعة) قبل إنشاء أول صنف.
        </p>
        <Button render={<Link href="/dashboard/inventory/units" />}>إدارة الوحدات</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link
        href="/dashboard/inventory/items"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        الأصناف
      </Link>
      <h1 className="text-2xl font-bold">صنف جديد</h1>

      <ItemForm
        categories={categories.map((c) => ({ id: c.id, label: c.name }))}
        brands={brands.map((b) => ({ id: b.id, label: b.name }))}
        units={units.map((u) => ({ id: u.id, label: u.nameAr }))}
      />
    </div>
  );
}
