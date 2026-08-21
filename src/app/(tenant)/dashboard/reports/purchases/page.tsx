import Link from "next/link";
import { Download } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const STATUS_LABELS: Record<string, { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
  DRAFT: { label: "مسودة", variant: "outline" },
  POSTED: { label: "معتمدة", variant: "default" },
  CANCELLED: { label: "ملغاة", variant: "destructive" },
};

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function PurchasesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { companyId } = await requireTenant();
  const params = await searchParams;

  const now = new Date();
  const dateFrom = params.from ? new Date(params.from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const dateTo = params.to ? new Date(`${params.to}T23:59:59`) : now;

  const purchases = await prisma.purchase.findMany({
    where: { companyId, date: { gte: dateFrom, lte: dateTo } },
    include: { supplier: true, warehouse: true },
    orderBy: { date: "desc" },
  });

  const postedTotal = purchases.filter((p) => p.status === "POSTED").reduce((sum, p) => sum + Number(p.grandTotal), 0);
  const qs = `from=${toInputDate(dateFrom)}&to=${toInputDate(dateTo)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/reports" className="text-sm text-muted-foreground hover:text-foreground">
            التقارير
          </Link>
          <h1 className="text-2xl font-bold">تقرير المشتريات</h1>
        </div>
        <Button variant="outline" render={<Link href={`/api/reports/purchases/csv?${qs}`} />}>
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
        <CardContent className="py-4">
          <p>
            إجمالي الفواتير المعتمدة:{" "}
            <span className="font-mono text-lg font-bold tabular-nums">{postedTotal.toLocaleString("ar")}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الفواتير ({purchases.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا توجد فواتير في هذه الفترة</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>المخزن</TableHead>
                  <TableHead>الإجمالي</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((p) => {
                  const status = STATUS_LABELS[p.status] ?? { label: p.status, variant: "outline" as const };
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">
                        <Link href={`/dashboard/purchases/${p.id}`} className="text-primary hover:underline">
                          {p.docNo}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.date.toLocaleDateString("ar-EG")}</TableCell>
                      <TableCell className="font-medium">{p.supplier.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.warehouse.name}</TableCell>
                      <TableCell className="font-mono tabular-nums">{p.grandTotal.toString()}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
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
