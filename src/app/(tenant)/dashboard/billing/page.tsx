import Link from "next/link";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getSubscriptionWithPlan } from "@/lib/services/billing/subscriptionGuard";
import { getUsageSummary } from "@/lib/services/billing/usage";
import { getPlanPriceForCompany } from "@/lib/services/billing/pricing";
import { listAvailableGatewayCodes, gatewayLabel } from "@/lib/services/billing/gateways";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckoutButton } from "./CheckoutButton";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  TRIALING: { label: "فترة تجريبية", variant: "secondary" },
  ACTIVE: { label: "نشط", variant: "default" },
  PAST_DUE: { label: "متأخر السداد", variant: "destructive" },
  EXPIRED: { label: "منتهي الصلاحية", variant: "destructive" },
  CANCELLED: { label: "ملغى", variant: "outline" },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "قيد المراجعة", variant: "secondary" },
  PAID: { label: "مدفوعة", variant: "default" },
  FAILED: { label: "مرفوضة / فشلت", variant: "destructive" },
  REFUNDED: { label: "مستردة", variant: "outline" },
};

function ProgressBar({ current, max }: { current: number; max: number }) {
  const pct = Math.min(100, Math.round((current / max) * 100));
  const danger = pct >= 90;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all ${danger ? "bg-destructive" : "bg-primary"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString("ar");
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { companyId } = await requireTenant();
  const sp = await searchParams;

  const [subscription, company] = await Promise.all([
    getSubscriptionWithPlan(companyId),
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
  ]);

  const [usage, plans, payments] = await Promise.all([
    getUsageSummary(companyId, subscription.plan),
    prisma.plan.findMany({ where: { isPublic: true, isActive: true, isTrial: false }, orderBy: { sortOrder: "asc" } }),
    prisma.payment.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, include: { plan: true } }),
  ]);

  const pricedPlans = await Promise.all(plans.map(async (plan) => ({ plan, price: await getPlanPriceForCompany(plan, company) })));

  const daysLeft = Math.max(0, Math.ceil((subscription.currentPeriodEnd.getTime() - new Date().getTime()) / 86400000));
  const gatewayCodes = listAvailableGatewayCodes();
  const statusInfo = STATUS_LABELS[subscription.status];

  return (
    <div className="flex flex-col gap-6">
      {sp.paypal === "success" && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          تم الدفع عبر PayPal بنجاح — تم تفعيل اشتراكك الجديد.
        </div>
      )}
      {sp.paypal === "failed" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          فشلت عملية الدفع عبر PayPal. لم يُخصم أي مبلغ — يمكنك المحاولة مرة أخرى.
        </div>
      )}
      {sp.paypal === "cancelled" && (
        <div className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          تم إلغاء عملية الدفع.
        </div>
      )}
      {sp.mock === "success" && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          تم تفعيل الاشتراك عبر بوابة الاختبار (لا يوجد دفع فعلي).
        </div>
      )}
      {sp.submitted === "1" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
          تم استلام بيانات الدفع بنجاح — سيراجعها فريق المنصة ويُفعَّل اشتراكك عند التأكد من التحويل.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الفوترة والاشتراك</h1>
          <p className="text-sm text-muted-foreground">{subscription.plan.nameAr}</p>
        </div>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>

      {(subscription.status === "EXPIRED" || subscription.status === "PAST_DUE") && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          انتهت صلاحية اشتراكك — يمكنك الاستمرار في عرض بياناتك الحالية، لكن الإنشاء والتعديل معطَّل حتى تجدد
          الاشتراك من إحدى الخطط أدناه.
        </div>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 py-4 text-sm">
          <p>
            {subscription.status === "TRIALING" ? "تنتهي الفترة التجريبية في" : "ينتهي الاشتراك في"}:{" "}
            <span className="font-medium">{subscription.currentPeriodEnd.toLocaleDateString("ar-EG")}</span>
          </p>
          <p className="font-mono tabular-nums">{fmt(daysLeft)} يوم متبقٍ</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">استخدام الخطة الحالية</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {usage.map((u) => (
            <div key={u.labelAr}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{u.labelAr}</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {fmt(u.current)} / {fmt(u.max)}
                </span>
              </div>
              <ProgressBar current={u.current} max={u.max} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">الخطط المتاحة</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {pricedPlans.map(({ plan, price }) => {
            const isCurrent = plan.id === subscription.planId;
            return (
              <Card key={plan.id} className={isCurrent ? "border-primary" : ""}>
                <CardHeader>
                  <CardTitle>{plan.nameAr}</CardTitle>
                  <p className="font-mono text-2xl font-bold tabular-nums">
                    {fmt(price.amount)} <span className="text-sm font-normal text-muted-foreground">{price.currency} / شهريًا</span>
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm">
                  <p className="text-muted-foreground">{plan.description}</p>
                  <ul className="flex flex-col gap-1 text-muted-foreground">
                    <li>حتى {fmt(plan.maxUsers)} مستخدمين</li>
                    <li>حتى {fmt(plan.maxWarehouses)} مخازن</li>
                    <li>حتى {fmt(plan.maxItems)} صنف</li>
                    <li>حتى {fmt(plan.maxMonthlyDocuments)} مستند شهريًا</li>
                  </ul>
                  {isCurrent ? (
                    <Badge variant="secondary" className="w-fit">
                      خطتك الحالية
                    </Badge>
                  ) : (
                    <div className="mt-1 flex flex-col gap-2">
                      {gatewayCodes.map((code) => (
                        <CheckoutButton
                          key={code}
                          planId={plan.id}
                          gatewayCode={code}
                          variant={code === "paypal" ? "default" : "outline"}
                          label={`الدفع عبر ${gatewayLabel(code)}`}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">سجل المدفوعات</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا توجد مدفوعات بعد</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الخطة</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إثبات الدفع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => {
                  const statusBadge = PAYMENT_STATUS_LABELS[p.status];
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-muted-foreground">{p.createdAt.toLocaleDateString("ar-EG")}</TableCell>
                      <TableCell>{p.plan.nameAr}</TableCell>
                      <TableCell>{gatewayLabel(p.gateway)}</TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {fmt(Number(p.amount))} {p.currency}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                        {p.status === "FAILED" && p.rejectionReason && (
                          <p className="mt-1 text-xs text-muted-foreground">{p.rejectionReason}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.proofFileName ? (
                          <a
                            href={`/api/billing/payments/${p.id}/proof`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline"
                          >
                            عرض
                          </a>
                        ) : p.status === "PENDING" ? (
                          <Link href={`/dashboard/billing/pay/${p.id}`} className="text-primary underline">
                            إكمال بيانات الدفع
                          </Link>
                        ) : (
                          "—"
                        )}
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
