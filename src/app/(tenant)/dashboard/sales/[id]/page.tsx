import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SaleStatusActions } from "./status-actions";

const STATUS_LABELS: Record<string, { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
  DRAFT: { label: "مسودة", variant: "outline" },
  POSTED: { label: "معتمدة", variant: "default" },
  CANCELLED: { label: "ملغاة", variant: "destructive" },
};

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { companyId } = await requireTenant();

  const sale = await prisma.sale.findFirst({
    where: { id: Number(id), companyId },
    include: {
      customer: true,
      warehouse: true,
      items: { include: { item: true, unit: true } },
    },
  });
  if (!sale) notFound();

  const status = STATUS_LABELS[sale.status] ?? { label: sale.status, variant: "outline" as const };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link
        href="/dashboard/sales"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        المبيعات
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold">{sale.docNo}</h1>
          <p className="text-sm text-muted-foreground">
            {sale.customer.name} — {sale.warehouse.name} — {sale.date.toLocaleDateString("ar-EG")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          <SaleStatusActions saleId={sale.id} status={sale.status} />
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
                <TableHead>الإجمالي</TableHead>
                {sale.status === "POSTED" && <TableHead>الربح</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.item.nameAr ?? line.item.name}</TableCell>
                  <TableCell className="text-muted-foreground">{line.unit.nameAr}</TableCell>
                  <TableCell className="font-mono tabular-nums">{line.qty.toString()}</TableCell>
                  <TableCell className="font-mono tabular-nums">{line.unitPrice.toString()}</TableCell>
                  <TableCell className="font-mono tabular-nums font-medium">{line.total.toString()}</TableCell>
                  {sale.status === "POSTED" && (
                    <TableCell className="font-mono tabular-nums text-green-700 dark:text-green-400">
                      {line.profit.toString()}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col items-end gap-1 py-4 text-sm">
          <p>
            الإجمالي الفرعي: <span className="font-mono tabular-nums">{sale.subtotal.toString()}</span>
          </p>
          <p>
            الخصم: <span className="font-mono tabular-nums">{sale.discountTotal.toString()}</span>
          </p>
          <p>
            الضريبة: <span className="font-mono tabular-nums">{sale.taxTotal.toString()}</span>
          </p>
          <p className="text-base font-bold">
            الإجمالي الكلي: <span className="font-mono tabular-nums">{sale.grandTotal.toString()}</span>
          </p>
          <p className="text-muted-foreground">
            المحصَّل: <span className="font-mono tabular-nums">{sale.paidAmount.toString()}</span> — المتبقي:{" "}
            <span className="font-mono tabular-nums">{sale.remainingAmount.toString()}</span>
          </p>
          {sale.status === "POSTED" && (
            <p className="font-medium text-green-700 dark:text-green-400">
              إجمالي الربح: <span className="font-mono tabular-nums">{sale.totalProfit.toString()}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
