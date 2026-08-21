import Link from "next/link";
import { Download } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function LowStockReportPage() {
  const { companyId } = await requireTenant();

  const items = await prisma.item.findMany({
    where: { companyId, isActive: true, reorderPoint: { gt: 0 } },
    include: { stockBalances: { include: { warehouse: true } } },
  });

  const rows = items.flatMap((item) => {
    const totalQty = item.stockBalances.reduce((sum, b) => sum + Number(b.qty), 0);
    if (totalQty > Number(item.reorderPoint)) return [];
    return [
      {
        item: item.nameAr ?? item.name,
        code: item.code,
        currentQty: totalQty,
        reorderPoint: Number(item.reorderPoint),
        outOfStock: totalQty <= 0,
      },
    ];
  });
  rows.sort((a, b) => a.currentQty - b.currentQty);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/reports" className="text-sm text-muted-foreground hover:text-foreground">
            التقارير
          </Link>
          <h1 className="text-2xl font-bold">الأصناف تحت حد الطلب</h1>
        </div>
        <Button variant="outline" render={<Link href="/api/reports/low-stock/csv" />}>
          <Download />
          تصدير CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">النتائج ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              كل الأصناف فوق حد إعادة الطلب — لا يوجد ما يستدعي القلق
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصنف</TableHead>
                  <TableHead>الكود</TableHead>
                  <TableHead>الرصيد الحالي</TableHead>
                  <TableHead>حد إعادة الطلب</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.item}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{r.code}</TableCell>
                    <TableCell className="font-mono tabular-nums">{r.currentQty.toLocaleString("ar")}</TableCell>
                    <TableCell className="font-mono tabular-nums text-muted-foreground">
                      {r.reorderPoint.toLocaleString("ar")}
                    </TableCell>
                    <TableCell>
                      {r.outOfStock ? (
                        <Badge variant="destructive">نفد المخزون</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
                          تحت الحد
                        </Badge>
                      )}
                    </TableCell>
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
