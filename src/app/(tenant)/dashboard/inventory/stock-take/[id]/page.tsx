import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CountSheetForm } from "./count-sheet-form";

export default async function StockTakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { companyId } = await requireTenant();

  const stockTake = await prisma.stockTake.findFirst({
    where: { id: Number(id), companyId },
    include: { warehouse: true, items: { include: { item: true } } },
  });
  if (!stockTake) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link
        href="/dashboard/inventory/stock-take"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        الجرد
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold">{stockTake.docNo}</h1>
          <p className="text-sm text-muted-foreground">{stockTake.warehouse.name}</p>
        </div>
        <Badge variant={stockTake.status === "POSTED" ? "default" : "outline"}>
          {stockTake.status === "POSTED" ? "معتمد" : "مسودة (جارٍ العد)"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {stockTake.status === "DRAFT" ? "أدخل الكميات الفعلية بعد العد" : "نتيجة الجرد"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stockTake.status === "DRAFT" ? (
            <CountSheetForm
              stockTakeId={stockTake.id}
              lines={stockTake.items.map((l) => ({
                stockTakeItemId: l.id,
                itemLabel: l.item.nameAr ?? l.item.name,
                bookQty: l.bookQty.toString(),
                actualQty: l.actualQty.toString(),
              }))}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصنف</TableHead>
                  <TableHead>الرصيد الدفتري</TableHead>
                  <TableHead>الكمية الفعلية</TableHead>
                  <TableHead>الفرق</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockTake.items.map((l) => {
                  const diff = Number(l.actualQty) - Number(l.bookQty);
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.item.nameAr ?? l.item.name}</TableCell>
                      <TableCell className="font-mono tabular-nums text-muted-foreground">
                        {l.bookQty.toString()}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">{l.actualQty.toString()}</TableCell>
                      <TableCell
                        className={
                          diff > 0
                            ? "font-mono tabular-nums text-success"
                            : diff < 0
                              ? "font-mono tabular-nums text-destructive"
                              : "font-mono tabular-nums text-muted-foreground"
                        }
                      >
                        {diff > 0 ? `+${diff}` : diff}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
