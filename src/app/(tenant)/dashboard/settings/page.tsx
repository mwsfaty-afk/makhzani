import Link from "next/link";
import { requireTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const COUNTRY_LABELS: Record<string, string> = { SA: "السعودية", EG: "مصر" };

export default async function SettingsPage() {
  const { companyId, session, roleName, isOwner } = await requireTenant();
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold">الإعدادات</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">حسابي</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <Row label="الاسم" value={session.user.name ?? "—"} />
          <Row label="البريد الإلكتروني" value={<span dir="ltr">{session.user.email}</span>} />
          <Row
            label="الدور"
            value={
              <span className="flex items-center gap-2">
                {roleName ?? "بدون دور"}
                {isOwner && <Badge variant="outline">مالك</Badge>}
              </span>
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الشركة</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <Row label="اسم الشركة" value={company.name} />
          <Row label="الدولة" value={COUNTRY_LABELS[company.country] ?? company.country} />
          <Row label="العملة" value={`${company.currency}${company.currencySymbol ? ` (${company.currencySymbol})` : ""}`} />
          <Row label="نوع النشاط" value={company.businessType ?? "—"} />
          <Row label="تاريخ التسجيل" value={company.createdAt.toLocaleDateString("ar-EG")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الاشتراك والفوترة</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">إدارة الباقة والدفع من صفحة الفوترة المخصصة.</p>
          <Button render={<Link href="/dashboard/billing" />} variant="outline" size="sm">
            الفوترة والاشتراك
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
