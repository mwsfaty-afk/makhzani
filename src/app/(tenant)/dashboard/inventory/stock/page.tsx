import Link from "next/link";
import { requireTenant } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StockAdjustmentDialog } from "./stock-adjustment-dialog";

export default async function StockPage() {
  const { db } = await requireTenant();

  const [balances, items, warehouses] = await Promise.all([
    db.stockBalance.findMany({
      where: { qty: { not: 0 } },
      include: { item: true, warehouse: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.item.findMany({ orderBy: { nameAr: "asc" } }),
    db.warehouse.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>أرصدة المخزون ({balances.length})</CardTitle>
        <StockAdjustmentDialog
          items={items.map((i) => ({ id: i.id, label: `${i.nameAr ?? i.name} (${i.code})` }))}
          warehouses={warehouses.map((w) => ({ id: w.id, label: w.name }))}
        />
      </CardHeader>
      <CardContent>
        {balances.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            لا يوجد رصيد مخزون بعد — ابدأ بإضافة رصيد افتتاحي لصنف
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الصنف</TableHead>
                <TableHead>المخزن</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead>متوسط التكلفة</TableHead>
                <TableHead>قيمة المخزون</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((b) => {
                const value = Number(b.qty) * Number(b.avgCost);
                const low = Number(b.qty) <= Number(b.item.reorderPoint) && Number(b.item.reorderPoint) > 0;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.item.nameAr ?? b.item.name}</TableCell>
                    <TableCell className="text-muted-foreground">{b.warehouse.name}</TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {b.qty.toString()}
                      {low && (
                        <Badge variant="outline" className="ms-2 text-destructive">
                          تحت حد الطلب
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-muted-foreground">
                      {b.avgCost.toString()}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">{value.toLocaleString("ar")}</TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/inventory/stock/${b.itemId}`}
                        className="text-sm text-primary hover:underline"
                      >
                        كارت الصنف
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
