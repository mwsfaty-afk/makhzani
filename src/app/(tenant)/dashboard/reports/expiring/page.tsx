import Link from "next/link";
import { Download } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const DAY_OPTIONS = [30, 60, 90] as const;

export default async function ExpiringReportPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { companyId } = await requireTenant();
  const { days: daysParam } = await searchParams;
  const days = DAY_OPTIONS.includes(Number(daysParam) as never) ? Number(daysParam) : 60;

  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const [movements, balances] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { companyId, expiryDate: { not: null, lte: cutoff } },
      include: { item: true, warehouse: true },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.stockBalance.findMany({ where: { companyId, qty: { gt: 0 } } }),
  ]);

  const balanceMap = new Map(balances.map((b) => [`${b.itemId}-${b.warehouseId}`, Number(b.qty)]));
  const seen = new Set<string>();
  const rows = movements.flatMap((m) => {
    const key = `${m.itemId}-${m.warehouseId}`;
    const currentQty = balanceMap.get(key);
    if (!currentQty || seen.has(key)) return [];
    seen.add(key);
    const daysLeft = Math.ceil((m.expiryDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return [
      {
        item: m.item.nameAr ?? m.item.name,
        code: m.item.code,
        warehouse: m.warehouse.name,
        currentQty,
        expiryDate: m.expiryDate!,
        daysLeft,
      },
    ];
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/reports" className="text-sm text-muted-foreground hover:text-foreground">
            التقارير
          </Link>
          <h1 className="text-2xl font-bold">أصناف قرب انتهاء الصلاحية</h1>
        </div>
        <Button variant="outline" render={<Link href={`/api/reports/expiring/csv?days=${days}`} />}>
          <Download />
          تصدير CSV
        </Button>
      </div>

      <div className="flex gap-2 text-sm">
        {DAY_OPTIONS.map((d) => (
          <Link
            key={d}
            href={`/dashboard/reports/expiring?days=${d}`}
            className={`rounded-md px-3 py-1.5 ${days === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            خلال {d} يوم
          </Link>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        تقديري بناءً على تواريخ الصلاحية المسجَّلة عند التوريد، وليس تتبعًا دقيقًا للدفعات (Batch) — يُعرض أقرب تاريخ صلاحية مسجَّل
        لكل صنف/مخزن لا يزال به رصيد فعلي.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">النتائج ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا توجد أصناف قرب انتهاء الصلاحية بهذا المعيار</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصنف</TableHead>
                  <TableHead>الكود</TableHead>
                  <TableHead>المخزن</TableHead>
                  <TableHead>الرصيد الحالي</TableHead>
                  <TableHead>تاريخ الصلاحية</TableHead>
                  <TableHead>الأيام المتبقية</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.item}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{r.code}</TableCell>
                    <TableCell className="text-muted-foreground">{r.warehouse}</TableCell>
                    <TableCell className="font-mono tabular-nums">{r.currentQty.toLocaleString("ar")}</TableCell>
                    <TableCell className="text-muted-foreground">{r.expiryDate.toLocaleDateString("ar-EG")}</TableCell>
                    <TableCell>
                      <span
                        className={`font-mono tabular-nums ${r.daysLeft <= 7 ? "text-destructive font-bold" : r.daysLeft <= 30 ? "text-warning" : ""}`}
                      >
                        {r.daysLeft}
                      </span>
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
