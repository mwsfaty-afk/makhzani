import Link from "next/link";
import { Download } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function FastMovingReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { companyId } = await requireTenant();
  const params = await searchParams;

  const now = new Date();
  const dateFrom = params.from ? new Date(params.from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const dateTo = params.to ? new Date(`${params.to}T23:59:59`) : now;

  const grouped = await prisma.stockMovement.groupBy({
    by: ["itemId"],
    where: { companyId, qtyOut: { gt: 0 }, movementDate: { gte: dateFrom, lte: dateTo } },
    _sum: { qtyOut: true },
    orderBy: { _sum: { qtyOut: "desc" } },
    take: 20,
  });

  const items = await prisma.item.findMany({ where: { id: { in: grouped.map((g) => g.itemId) } } });
  const itemById = new Map(items.map((i) => [i.id, i]));

  const rows = grouped.map((g) => {
    const item = itemById.get(g.itemId);
    return { item: item?.nameAr ?? item?.name ?? "—", code: item?.code ?? "—", totalOut: Number(g._sum.qtyOut ?? 0) };
  });

  const qs = `from=${toInputDate(dateFrom)}&to=${toInputDate(dateTo)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/reports" className="text-sm text-muted-foreground hover:text-foreground">
            التقارير
          </Link>
          <h1 className="text-2xl font-bold">الأصناف الأكثر حركة</h1>
        </div>
        <Button variant="outline" render={<Link href={`/api/reports/fast-moving/csv?${qs}`} />}>
          <Download />
          تصدير CSV
        </Button>
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from">من تاريخ</Label>
          <Input id="from" name="from" type="date" defaultValue={toInputDate(dateFrom)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to">إلى تاريخ</Label>
          <Input id="to" name="to" type="date" defaultValue={toInputDate(dateTo)} />
        </div>
        <Button type="submit">تطبيق</Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">أعلى {rows.length} صنفًا حركةً (كمية صادرة)</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا توجد حركات صرف في هذه الفترة</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>الصنف</TableHead>
                  <TableHead>الكود</TableHead>
                  <TableHead>إجمالي الكمية الصادرة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono tabular-nums text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.item}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{r.code}</TableCell>
                    <TableCell className="font-mono tabular-nums font-medium">{r.totalOut.toLocaleString("ar")}</TableCell>
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
