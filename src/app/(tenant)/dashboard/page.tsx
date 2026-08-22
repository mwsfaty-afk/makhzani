import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getDashboardData } from "@/lib/services/reports/getDashboardData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { SalesPurchasesChart } from "./sales-purchases-chart";

function fmt(n: number) {
  return n.toLocaleString("ar");
}

export default async function DashboardPage() {
  const { db, companyId, session } = await requireTenant();

  const [company, teamMembers, subscription, data] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    db.user.findMany({ orderBy: { createdAt: "asc" }, include: { role: true } }),
    prisma.subscription.findUnique({ where: { companyId }, include: { plan: true } }),
    getDashboardData(companyId),
  ]);

  const now = new Date();
  const trialDaysLeft = subscription?.trialEnd
    ? Math.max(0, Math.ceil((subscription.trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const monthChangePercent =
    data.sales.lastMonth > 0 ? ((data.sales.month - data.sales.lastMonth) / data.sales.lastMonth) * 100 : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">مرحبًا {session.user.name}</h1>
          <p className="text-sm text-muted-foreground">{company?.name}</p>
        </div>
        {subscription && (
          <Badge variant="secondary">
            {subscription.plan.nameAr}
            {trialDaysLeft !== null && ` — متبقٍ ${trialDaysLeft} يوم`}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Kpi label="مبيعات اليوم" value={fmt(data.sales.today)} />
        <Kpi label="مبيعات الأسبوع" value={fmt(data.sales.week)} />
        <Kpi
          label="مبيعات الشهر"
          value={fmt(data.sales.month)}
          trend={monthChangePercent}
        />
        <Kpi label="مشتريات الشهر" value={fmt(data.purchases.month)} />
        <Kpi label="ربح الشهر" value={fmt(data.profitMonth)} highlight />
        <Kpi label="قيمة المخزون" value={fmt(data.inventory.value)} />
        <Kpi label="رصيد الخزينة" value={fmt(data.cashTotal)} />
        <Kpi label="عدد الأصناف" value={fmt(data.inventory.itemCount)} />
        <Kpi label="مديونية العملاء" value={fmt(data.customerDebtTotal)} />
        <Kpi label="مستحق للموردين" value={fmt(data.supplierDebtTotal)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">المبيعات والمشتريات — آخر 14 يومًا</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesPurchasesChart data={data.trend} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">أعلى الموردين (هذا الشهر)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topSuppliers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد مشتريات هذا الشهر بعد</p>
            ) : (
              <Table>
                <TableBody>
                  {data.topSuppliers.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="font-mono tabular-nums">{fmt(s.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">أعضاء الفريق ({teamMembers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الدور</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.name}
                      {member.isOwner && (
                        <Badge variant="outline" className="ms-2">
                          مالك
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{member.role?.name ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  highlight,
  trend,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  trend?: number | null;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-mono text-xl font-bold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</p>
        {trend !== undefined && trend !== null && (
          <p
            className={`mt-1 flex items-center gap-1 text-xs ${trend >= 0 ? "text-success" : "text-destructive"}`}
          >
            {trend >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(trend).toFixed(1)}% عن الشهر السابق
          </p>
        )}
      </CardContent>
    </Card>
  );
}
