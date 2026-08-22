import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { gatewayLabel } from "@/lib/services/billing/gateways";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompanyStatusControl } from "./CompanyStatusControl";

const COMPANY_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "نشطة", variant: "default" },
  SUSPENDED: { label: "معطَّلة", variant: "destructive" },
  CANCELLED: { label: "ملغاة", variant: "outline" },
};

const SUB_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  TRIALING: { label: "فترة تجريبية", variant: "secondary" },
  ACTIVE: { label: "نشط", variant: "default" },
  PAST_DUE: { label: "متأخر السداد", variant: "destructive" },
  EXPIRED: { label: "منتهي", variant: "destructive" },
  CANCELLED: { label: "ملغى", variant: "outline" },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "قيد المراجعة", variant: "secondary" },
  PAID: { label: "مدفوعة", variant: "default" },
  FAILED: { label: "مرفوضة / فشلت", variant: "destructive" },
  REFUNDED: { label: "مستردة", variant: "outline" },
};

export default async function AdminCompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const companyId = Number(id);

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { subscription: { include: { plan: true } } },
  });
  if (!company) notFound();

  const [users, payments] = await Promise.all([
    prisma.user.findMany({ where: { companyId }, orderBy: { createdAt: "asc" }, include: { role: true } }),
    prisma.payment.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, take: 20, include: { plan: true } }),
  ]);

  const companyStatus = COMPANY_STATUS_LABELS[company.status];
  const subStatus = company.subscription ? SUB_STATUS_LABELS[company.subscription.status] : null;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/companies" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronRight className="size-4" />
        الشركات
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <p className="text-sm text-muted-foreground">{company.ownerName} · {company.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={companyStatus.variant}>{companyStatus.label}</Badge>
          <CompanyStatusControl companyId={company.id} status={company.status} companyName={company.name} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">بيانات الشركة</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">الدولة</span><span>{company.country}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">العملة</span><span>{company.currency}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">النشاط</span><span>{company.businessType ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">الهاتف</span><span dir="ltr">{company.phone ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">تاريخ التسجيل</span><span>{company.createdAt.toLocaleDateString("ar-EG")}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">الاشتراك</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">الخطة</span><span>{company.subscription?.plan.nameAr ?? "—"}</span></div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الحالة</span>
              {subStatus && <Badge variant={subStatus.variant}>{subStatus.label}</Badge>}
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">ينتهي في</span><span>{company.subscription?.currentPeriodEnd.toLocaleDateString("ar-EG") ?? "—"}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">المستخدمون ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name}
                    {u.isOwner && <Badge variant="outline" className="ms-2">مالك</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground" dir="ltr">{u.email}</TableCell>
                  <TableCell>{u.role?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "نشط" : "معطَّل"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                  <TableHead>الطريقة</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => {
                  const status = PAYMENT_STATUS_LABELS[p.status];
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-muted-foreground">{p.createdAt.toLocaleDateString("ar-EG")}</TableCell>
                      <TableCell>{p.plan.nameAr}</TableCell>
                      <TableCell>{gatewayLabel(p.gateway)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{Number(p.amount).toLocaleString("ar")} {p.currency}</TableCell>
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
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
