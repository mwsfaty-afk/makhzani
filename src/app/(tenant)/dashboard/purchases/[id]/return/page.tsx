import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PurchaseReturnForm } from "./return-form";

export default async function PurchaseReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { companyId } = await requireTenant();

  const purchase = await prisma.purchase.findFirst({
    where: { id: Number(id), companyId },
    include: { items: { include: { item: true, unit: true } } },
  });
  if (!purchase) notFound();
  if (purchase.status !== "POSTED") notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link
        href={`/dashboard/purchases/${purchase.id}`}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        {purchase.docNo}
      </Link>
      <h1 className="text-2xl font-bold">مرتجع مشتريات — {purchase.docNo}</h1>

      <PurchaseReturnForm
        purchaseId={purchase.id}
        lines={purchase.items.map((l) => ({
          purchaseItemId: l.id,
          itemLabel: l.item.nameAr ?? l.item.name,
          unitLabel: l.unit.nameAr,
          purchasedQty: l.qty.toString(),
          unitPrice: l.unitPrice.toString(),
        }))}
      />
    </div>
  );
}
