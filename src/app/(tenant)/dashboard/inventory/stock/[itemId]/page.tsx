import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const MOVEMENT_LABELS: Record<string, string> = {
  PURCHASE: "شراء",
  PURCHASE_RETURN: "مرتجع شراء",
  SALE: "بيع",
  SALE_RETURN: "مرتجع بيع",
  TRANSFER_IN: "تحويل وارد",
  TRANSFER_OUT: "تحويل صادر",
  STOCK_ADJUSTMENT_IN: "تسوية وارد",
  STOCK_ADJUSTMENT_OUT: "تسوية صادر",
  DAMAGE: "هالك",
  OPENING_BALANCE: "رصيد افتتاحي",
};

export default async function StockCardPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const { db } = await requireTenant();

  const item = await db.item.findUnique({ where: { id: Number(itemId) } });
  if (!item) notFound();

  const movements = await db.stockMovement.findMany({
    where: { itemId: Number(itemId) },
    include: { warehouse: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/dashboard/inventory/stock"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        أرصدة المخزون
      </Link>
      <h1 className="text-2xl font-bold">كارت الصنف — {item.nameAr ?? item.name}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">سجل الحركات ({movements.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا توجد حركات بعد</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المستند</TableHead>
                  <TableHead>المخزن</TableHead>
                  <TableHead>وارد</TableHead>
                  <TableHead>صادر</TableHead>
                  <TableHead>التكلفة</TableHead>
                  <TableHead>الرصيد بعد الحركة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id.toString()}>
                    <TableCell className="text-muted-foreground">
                      {m.movementDate.toLocaleDateString("ar-EG")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{MOVEMENT_LABELS[m.movementType] ?? m.movementType}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{m.documentNo}</TableCell>
                    <TableCell className="text-muted-foreground">{m.warehouse.name}</TableCell>
                    <TableCell className="font-mono tabular-nums text-success">
                      {Number(m.qtyIn) > 0 ? m.qtyIn.toString() : "—"}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-destructive">
                      {Number(m.qtyOut) > 0 ? m.qtyOut.toString() : "—"}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-muted-foreground">
                      {m.unitCost.toString()}
                    </TableCell>
                    <TableCell className="font-mono font-medium tabular-nums">{m.balanceAfter.toString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
