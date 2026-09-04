import Link from "next/link";
import { getAdminDashboardData } from "@/lib/services/admin/getAdminDashboardData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SUB_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  TRIALING: { label: "تجريبي", variant: "secondary" },
  ACTIVE: { label: "نشط", variant: "default" },
  PAST_DUE: { label: "متأخر السداد", variant: "destructive" },
  EXPIRED: { label: "منتهي", variant: "destructive" },
  CANCELLED: { label: "ملغى", variant: "outline" },
};

const COMPANY_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "نشطة", variant: "default" },
  SUSPENDED: { label: "معطَّلة", variant: "destructive" },
  CANCELLED: { label: "ملغاة", variant: "outline" },
};

function fmt(n: number) {
  return n.toLocaleString("ar");
}

function Kpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-mono text-xl font-bold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">لوحة تحكم المنصة</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Kpi label="إجمالي الشركات" value={fmt(data.totalCompanies)} />
        <Kpi label="شركات نشطة" value={fmt(data.companies.active)} />
        <Kpi label="شركات معطَّلة" value={fmt(data.companies.suspended)} highlight={data.companies.suspended > 0} />
        <Kpi label="اشتراكات نشطة" value={fmt(data.subscriptions.active)} />
        <Kpi label="فترة تجريبية" value={fmt(data.subscriptions.trialing)} />
        <Kpi label="اشتراكات منتهية" value={fmt(data.subscriptions.expired)} />
        <Kpi label="دفعات بانتظار المراجعة" value={fmt(data.pendingPaymentsCount)} highlight={data.pendingPaymentsCount > 0} />
        {data.revenueThisMonth.map((r) => (
          <Kpi key={r.currency} label={`إيرادات الشهر (${r.currency})`} value={fmt(r.amount)} />
        ))}
      </div>

      {data.pendingPaymentsCount > 0 && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          يوجد {fmt(data.pendingPaymentsCount)} دفعة بانتظار المراجعة —{" "}
          <Link href="/omar/payments" className="font-medium text-primary underline">
            مراجعتها الآن
          </Link>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">أحدث الشركات المسجَّلة</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الشركة</TableHead>
                <TableHead>الدولة</TableHead>
                <TableHead>الخطة</TableHead>
                <TableHead>حالة الاشتراك</TableHead>
                <TableHead>حالة الشركة</TableHead>
                <TableHead>تاريخ التسجيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentCompanies.map((c) => {
                const subStatus = c.subscription ? SUB_STATUS_LABELS[c.subscription.status] : null;
                const companyStatus = COMPANY_STATUS_LABELS[c.status];
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link href={`/omar/companies/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.country}</TableCell>
                    <TableCell>{c.subscription?.plan.nameAr ?? "—"}</TableCell>
                    <TableCell>{subStatus && <Badge variant={subStatus.variant}>{subStatus.label}</Badge>}</TableCell>
                    <TableCell>{companyStatus && <Badge variant={companyStatus.variant}>{companyStatus.label}</Badge>}</TableCell>
                    <TableCell className="text-muted-foreground">{c.createdAt.toLocaleDateString("ar-EG")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
