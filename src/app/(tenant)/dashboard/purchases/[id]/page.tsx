import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PurchaseStatusActions } from "./status-actions";

const STATUS_LABELS: Record<string, { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
  DRAFT: { label: "مسودة", variant: "outline" },
  POSTED: { label: "معتمدة", variant: "default" },
  CANCELLED: { label: "ملغاة", variant: "destructive" },
};

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { companyId } = await requireTenant();

  // include متداخل (items.item/unit) لا يُستنتج نوعه بشكل صحيح عبر عميل tenantPrisma
  // الممتد، فنستخدم هنا prisma الخام مع فلتر companyId صريح لنفس أثر العزل تمامًا.
  const purchase = await prisma.purchase.findFirst({
    where: { id: Number(id), companyId },
    include: {
      supplier: true,
      warehouse: true,
      items: { include: { item: true, unit: true } },
    },
  });
  if (!purchase) notFound();

  const status = STATUS_LABELS[purchase.status] ?? { label: purchase.status, variant: "outline" as const };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link
        href="/dashboard/purchases"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        المشتريات
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold">{purchase.docNo}</h1>
          <p className="text-sm text-muted-foreground">
            {purchase.supplier.name} — {purchase.warehouse.name} — {purchase.date.toLocaleDateString("ar-EG")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          <PurchaseStatusActions purchaseId={purchase.id} status={purchase.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الأصناف</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الصنف</TableHead>
                <TableHead>الوحدة</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead>سعر الوحدة</TableHead>
                <TableHead>خصم</TableHead>
                <TableHead>ضريبة</TableHead>
                <TableHead>الإجمالي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.items.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.item.nameAr ?? line.item.name}</TableCell>
                  <TableCell className="text-muted-foreground">{line.unit.nameAr}</TableCell>
                  <TableCell className="font-mono tabular-nums">{line.qty.toString()}</TableCell>
                  <TableCell className="font-mono tabular-nums">{line.unitPrice.toString()}</TableCell>
                  <TableCell className="font-mono tabular-nums">{line.discount.toString()}</TableCell>
                  <TableCell className="font-mono tabular-nums">{line.tax.toString()}</TableCell>
                  <TableCell className="font-mono tabular-nums font-medium">{line.total.toString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col items-end gap-1 py-4 text-sm">
          <p>
            الإجمالي الفرعي: <span className="font-mono tabular-nums">{purchase.subtotal.toString()}</span>
          </p>
          <p>
            الخصم: <span className="font-mono tabular-nums">{purchase.discountTotal.toString()}</span>
          </p>
          <p>
            الضريبة: <span className="font-mono tabular-nums">{purchase.taxTotal.toString()}</span>
          </p>
          <p className="text-base font-bold">
            الإجمالي الكلي: <span className="font-mono tabular-nums">{purchase.grandTotal.toString()}</span>
          </p>
          <p className="text-muted-foreground">
            المدفوع: <span className="font-mono tabular-nums">{purchase.paidAmount.toString()}</span> — المتبقي:{" "}
            <span className="font-mono tabular-nums">{purchase.remainingAmount.toString()}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
