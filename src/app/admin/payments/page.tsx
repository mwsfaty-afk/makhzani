import { requirePlatformAdmin } from "@/lib/auth/adminSession";
import { prisma } from "@/lib/db/prisma";
import { manualMethodLabel } from "@/lib/services/billing/gateways";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentReviewActions } from "./PaymentReviewActions";
import { adminLogoutAction } from "./actions";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "قيد المراجعة", variant: "secondary" },
  PAID: { label: "مدفوعة", variant: "default" },
  FAILED: { label: "مرفوضة / فشلت", variant: "destructive" },
  REFUNDED: { label: "مستردة", variant: "outline" },
};

const GATEWAY_LABELS: Record<string, string> = {
  paypal: "PayPal",
  vodafone_cash: "فودافون كاش",
  al_rajhi_bank: "تحويل بنكي (الراجحي)",
  mock: "بوابة اختبار (تطوير فقط)",
};

function gatewayLabel(code: string) {
  return GATEWAY_LABELS[code] ?? manualMethodLabel(code);
}

export default async function AdminPaymentsPage() {
  const admin = await requirePlatformAdmin();

  const [pending, recent] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { plan: true, company: true },
    }),
    prisma.payment.findMany({
      where: { status: { in: ["PAID", "FAILED", "REFUNDED"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { plan: true, company: true },
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">مراجعة المدفوعات</h1>
          <p className="text-sm text-muted-foreground">مسجَّل الدخول كـ {admin.name}</p>
        </div>
        <form action={adminLogoutAction}>
          <Button type="submit" variant="outline" size="sm">
            تسجيل الخروج
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">دفعات قيد المراجعة ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا توجد دفعات بانتظار المراجعة</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الشركة</TableHead>
                  <TableHead>الخطة</TableHead>
                  <TableHead>الطريقة</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>رقم المرجع</TableHead>
                  <TableHead>الإثبات</TableHead>
                  <TableHead>الإجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.company.name}</TableCell>
                    <TableCell>{p.plan.nameAr}</TableCell>
                    <TableCell>{gatewayLabel(p.gateway)}</TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {Number(p.amount).toLocaleString("ar")} {p.currency}
                    </TableCell>
                    <TableCell className="font-mono">{p.referenceNumber ?? "—"}</TableCell>
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
                      ) : (
                        <span className="text-muted-foreground">لم يُرفع بعد</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <PaymentReviewActions paymentId={p.id} />
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
          <CardTitle className="text-base">آخر المدفوعات المُراجَعة</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا يوجد سجل بعد</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الشركة</TableHead>
                  <TableHead>الخطة</TableHead>
                  <TableHead>الطريقة</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((p) => {
                  const status = STATUS_LABELS[p.status];
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.company.name}</TableCell>
                      <TableCell>{p.plan.nameAr}</TableCell>
                      <TableCell>{gatewayLabel(p.gateway)}</TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {Number(p.amount).toLocaleString("ar")} {p.currency}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.createdAt.toLocaleDateString("ar-EG")}</TableCell>
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
