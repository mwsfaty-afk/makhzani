import Link from "next/link";
import { Download } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default async function InventoryValuationReportPage() {
  const { companyId } = await requireTenant();

  const balances = await prisma.stockBalance.findMany({
    where: { companyId, qty: { not: 0 } },
    include: { item: { include: { category: true } }, warehouse: true },
    orderBy: [{ item: { nameAr: "asc" } }],
  });

  const rows = balances.map((b) => ({
    item: b.item.nameAr ?? b.item.name,
    category: b.item.category?.name ?? "—",
    warehouse: b.warehouse.name,
    qty: Number(b.qty),
    avgCost: Number(b.avgCost),
    value: Number(b.qty) * Number(b.avgCost),
  }));
  const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
  const totalQty = rows.reduce((sum, r) => sum + r.qty, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/reports" className="text-sm text-muted-foreground hover:text-foreground">
            التقارير
          </Link>
          <h1 className="text-2xl font-bold">تقييم المخزون</h1>
        </div>
        <Button variant="outline" render={<Link href="/api/reports/inventory-valuation/csv" />}>
          <Download />
          تصدير CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <SummaryCard label="عدد الأصناف" value={rows.length.toLocaleString("ar")} />
        <SummaryCard label="إجمالي الكمية" value={totalQty.toLocaleString("ar")} />
        <SummaryCard label="إجمالي قيمة المخزون" value={totalValue.toLocaleString("ar")} highlight />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">التفاصيل</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا يوجد رصيد مخزون</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصنف</TableHead>
                  <TableHead>المجموعة</TableHead>
                  <TableHead>المخزن</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>متوسط التكلفة</TableHead>
                  <TableHead>القيمة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.item}</TableCell>
                    <TableCell className="text-muted-foreground">{r.category}</TableCell>
                    <TableCell className="text-muted-foreground">{r.warehouse}</TableCell>
                    <TableCell className="font-mono tabular-nums">{r.qty.toLocaleString("ar")}</TableCell>
                    <TableCell className="font-mono tabular-nums text-muted-foreground">
                      {r.avgCost.toLocaleString("ar")}
                    </TableCell>
                    <TableCell className="font-mono font-medium tabular-nums">
                      {r.value.toLocaleString("ar")}
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

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-mono text-xl font-bold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
