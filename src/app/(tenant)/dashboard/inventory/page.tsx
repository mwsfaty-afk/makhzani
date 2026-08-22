import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { requireTenant } from "@/lib/auth/session";
import { getInventoryOverview } from "@/lib/services/inventory/getInventoryOverview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function fmt(n: number) {
  return n.toLocaleString("ar");
}

export default async function InventoryControlCenterPage() {
  const { companyId } = await requireTenant();
  const data = await getInventoryOverview(companyId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">مركز تحكم المخزون</h1>
        <p className="text-sm text-muted-foreground">نظرة شاملة على حالة المخزون الآن — وليس مجرد إدارة أصناف</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Kpi label="عدد الأصناف برصيد" value={fmt(data.itemCount)} />
        <Kpi label="إجمالي الكمية" value={fmt(data.totalQty)} />
        <Kpi label="قيمة المخزون" value={fmt(data.totalValue)} highlight />
        <Kpi label="حركات اليوم" value={fmt(data.todayMovementCount)} sub={`${fmt(data.todayInCount)} وارد / ${fmt(data.todayOutCount)} صادر`} />
        <LinkKpi href="/dashboard/reports/low-stock" label="تحت حد الطلب" value={fmt(data.lowStockCount)} tone={data.lowStockCount > 0 ? "warning" : undefined} />
        <LinkKpi href="/dashboard/reports/dead-stock" label="أصناف راكدة" value={fmt(data.deadStockCount)} tone={data.deadStockCount > 0 ? "warning" : undefined} />
        <LinkKpi href="/dashboard/reports/expiring" label="قرب انتهاء الصلاحية" value={fmt(data.expiringCount)} tone={data.expiringCount > 0 ? "danger" : undefined} />
        <LinkKpi href="/dashboard/inventory/stock-orders" label="أوامر التوريد والصرف" value="إدارة" tone="link" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">آخر عمليات الاستلام والصرف</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد حركات مخزون بعد</p>
            ) : (
              <Table>
                <TableBody>
                  {data.recentActivity.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="w-8">
                        {a.kind === "in" ? (
                          <ArrowDownToLine className="size-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <ArrowUpFromLine className="size-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{a.itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.warehouseName} — {a.documentNo}
                        </p>
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {a.kind === "in" ? "+" : "-"}
                        {fmt(a.qty)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">الأصناف الأكثر حركة (آخر 30 يومًا)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topFastMoving.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد حركات صرف بعد</p>
            ) : (
              <Table>
                <TableBody>
                  {data.topFastMoving.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell className="font-mono tabular-nums">{fmt(f.totalOut)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">المخزون حسب المستودع</CardTitle>
          </CardHeader>
          <CardContent>
            {data.warehouseBreakdown.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد مخازن نشطة</p>
            ) : (
              <Table>
                <TableBody>
                  {data.warehouseBreakdown.map((w, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell className="font-mono tabular-nums">{fmt(w.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, highlight, sub }: { label: string; value: string; highlight?: boolean; sub?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-mono text-xl font-bold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function LinkKpi({
  href,
  label,
  value,
  tone,
}: {
  href: string;
  label: string;
  value: string;
  tone?: "warning" | "danger" | "link";
}) {
  const valueClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "link"
          ? "text-primary"
          : "";
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-primary">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{label}</p>
            {tone === "warning" || tone === "danger" ? <Badge variant={tone === "danger" ? "destructive" : "outline"} className="h-4 px-1.5 text-[10px]">تنبيه</Badge> : null}
          </div>
          <p className={`font-mono text-xl font-bold tabular-nums ${valueClass}`}>{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
