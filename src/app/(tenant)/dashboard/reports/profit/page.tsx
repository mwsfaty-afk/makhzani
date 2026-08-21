import { requireTenant } from "@/lib/auth/session";
import { getProfitReport } from "@/lib/services/reports/getProfitReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function ProfitReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { companyId } = await requireTenant();
  const params = await searchParams;

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const dateFrom = params.from ? new Date(params.from) : defaultFrom;
  const dateTo = params.to ? new Date(`${params.to}T23:59:59`) : now;

  const report = await getProfitReport(companyId, dateFrom, dateTo);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">تقرير الأرباح</h1>
        <p className="text-sm text-muted-foreground">
          يشمل فواتير البيع المعتمدة فقط — الربح = الإيراد (بدون ضريبة) - تكلفة البضاعة المباعة
        </p>
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="عدد الفواتير" value={report.summary.invoiceCount.toLocaleString("ar")} />
        <SummaryCard label="الإيراد (بدون ضريبة)" value={report.summary.revenue.toLocaleString("ar")} />
        <SummaryCard label="تكلفة البضاعة المباعة" value={report.summary.cost.toLocaleString("ar")} />
        <SummaryCard
          label="صافي الربح"
          value={report.summary.profit.toLocaleString("ar")}
          highlight
          sub={`هامش الربح ${report.summary.marginPercent.toFixed(1)}%`}
        />
      </div>

      <ReportTable title="الربح حسب الصنف" rows={report.byItem} extraCol="الكمية المباعة" extraKey="qty" />
      <ReportTable title="الربح حسب العميل" rows={report.byCustomer} />
      <ReportTable title="الربح حسب المخزن" rows={report.byWarehouse} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
  sub,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-mono text-xl font-bold tabular-nums ${highlight ? "text-green-700 dark:text-green-400" : ""}`}>
          {value}
        </p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

type Row = { label: string; revenue: number; cost: number; profit: number; qty?: number };

function ReportTable({
  title,
  rows,
  extraCol,
  extraKey,
}: {
  title: string;
  rows: Row[];
  extraCol?: string;
  extraKey?: "qty";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">لا توجد بيانات في هذه الفترة</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                {extraCol && <TableHead>{extraCol}</TableHead>}
                <TableHead>الإيراد</TableHead>
                <TableHead>التكلفة</TableHead>
                <TableHead>الربح</TableHead>
                <TableHead>الهامش</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  {extraKey && <TableCell className="font-mono tabular-nums">{r[extraKey]}</TableCell>}
                  <TableCell className="font-mono tabular-nums">{r.revenue.toLocaleString("ar")}</TableCell>
                  <TableCell className="font-mono tabular-nums text-muted-foreground">
                    {r.cost.toLocaleString("ar")}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums font-medium text-green-700 dark:text-green-400">
                    {r.profit.toLocaleString("ar")}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums text-muted-foreground">
                    {r.revenue > 0 ? `${((r.profit / r.revenue) * 100).toFixed(1)}%` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
