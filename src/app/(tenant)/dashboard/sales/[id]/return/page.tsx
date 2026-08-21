import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { SaleReturnForm } from "./return-form";

export default async function SaleReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { companyId } = await requireTenant();

  const sale = await prisma.sale.findFirst({
    where: { id: Number(id), companyId },
    include: { items: { include: { item: true, unit: true } } },
  });
  if (!sale) notFound();
  if (sale.status !== "POSTED") notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link
        href={`/dashboard/sales/${sale.id}`}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        {sale.docNo}
      </Link>
      <h1 className="text-2xl font-bold">مرتجع مبيعات — {sale.docNo}</h1>

      <SaleReturnForm
        saleId={sale.id}
        lines={sale.items.map((l) => ({
          saleItemId: l.id,
          itemLabel: l.item.nameAr ?? l.item.name,
          unitLabel: l.unit.nameAr,
          soldQty: l.qty.toString(),
          unitPrice: l.unitPrice.toString(),
        }))}
      />
    </div>
  );
}
