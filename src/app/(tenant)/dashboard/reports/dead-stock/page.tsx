import Link from "next/link";
import { Download } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const DAY_OPTIONS = [30, 60, 90] as const;

export default async function DeadStockReportPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { companyId } = await requireTenant();
  const { days: daysParam } = await searchParams;
  const days = DAY_OPTIONS.includes(Number(daysParam) as never) ? Number(daysParam) : 60;

  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const [balances, lastOutMovements] = await Promise.all([
    prisma.stockBalance.findMany({
      where: { companyId, qty: { gt: 0 } },
      include: { item: true, warehouse: true },
    }),
    prisma.stockMovement.groupBy({
      by: ["itemId", "warehouseId"],
      where: { companyId, qtyOut: { gt: 0 } },
      _max: { movementDate: true },
    }),
  ]);

  const lastOutMap = new Map(lastOutMovements.map((m) => [`${m.itemId}-${m.warehouseId}`, m._max.movementDate]));

  const rows = balances.flatMap((b) => {
    const lastOut = lastOutMap.get(`${b.itemId}-${b.warehouseId}`) ?? null;
    const isDead = !lastOut || lastOut < cutoff;
    if (!isDead) return [];
    const daysSince = lastOut ? Math.floor((now.getTime() - lastOut.getTime()) / (24 * 60 * 60 * 1000)) : null;
    return [
      {
        item: b.item.nameAr ?? b.item.name,
        code: b.item.code,
        warehouse: b.warehouse.name,
        qty: Number(b.qty),
        lastOut,
        daysSince,
      },
    ];
  });
  rows.sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/reports" className="text-sm text-muted-foreground hover:text-foreground">
            التقارير
          </Link>
          <h1 className="text-2xl font-bold">الأصناف الراكدة</h1>
        </div>
        <Button variant="outline" render={<Link href={`/api/reports/dead-stock/csv?days=${days}`} />}>
          <Download />
          تصدير CSV
        </Button>
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div className="flex gap-2 text-sm">
          {DAY_OPTIONS.map((d) => (
            <Link
              key={d}
              href={`/dashboard/reports/dead-stock?days=${d}`}
              className={`rounded-md px-3 py-1.5 ${days === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
            >
              لم تتحرك منذ {d} يوم
            </Link>
          ))}
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">النتائج ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا توجد أصناف راكدة بهذا المعيار — كل المخزون يتحرك بانتظام</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصنف</TableHead>
                  <TableHead>الكود</TableHead>
                  <TableHead>المخزن</TableHead>
                  <TableHead>الرصيد</TableHead>
                  <TableHead>آخر حركة صرف</TableHead>
                  <TableHead>عدد الأيام</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.item}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{r.code}</TableCell>
                    <TableCell className="text-muted-foreground">{r.warehouse}</TableCell>
                    <TableCell className="font-mono tabular-nums">{r.qty.toLocaleString("ar")}</TableCell>
                    <TableCell className="text-muted-foreground">{r.lastOut ? r.lastOut.toLocaleDateString("ar-EG") : "لم يتحرك إطلاقًا"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-warning font-mono tabular-nums">
                        {r.daysSince ?? "—"}
                      </Badge>
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
