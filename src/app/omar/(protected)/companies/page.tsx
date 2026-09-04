import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const COMPANY_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "نشطة", variant: "default" },
  SUSPENDED: { label: "معطَّلة", variant: "destructive" },
  CANCELLED: { label: "ملغاة", variant: "outline" },
};

export default async function AdminCompaniesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;

  const companies = await prisma.company.findMany({
    where: status ? { status: status as "ACTIVE" | "SUSPENDED" | "CANCELLED" } : undefined,
    orderBy: { createdAt: "desc" },
    include: { subscription: { include: { plan: true } }, _count: { select: { users: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">الشركات ({companies.length})</h1>

      <div className="flex gap-2 text-sm">
        {[
          { value: undefined, label: "الكل" },
          { value: "ACTIVE", label: "نشطة" },
          { value: "SUSPENDED", label: "معطَّلة" },
          { value: "CANCELLED", label: "ملغاة" },
        ].map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/admin/companies?status=${f.value}` : "/admin/companies"}
            className={`rounded-md px-3 py-1.5 ${status === f.value || (!status && !f.value) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">قائمة الشركات</CardTitle>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا توجد شركات مطابقة</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الشركة</TableHead>
                  <TableHead>المالك</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>الدولة</TableHead>
                  <TableHead>المستخدمون</TableHead>
                  <TableHead>الخطة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ التسجيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c) => {
                  const companyStatus = COMPANY_STATUS_LABELS[c.status];
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <Link href={`/admin/companies/${c.id}`} className="hover:underline">
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.ownerName}</TableCell>
                      <TableCell className="text-muted-foreground" dir="ltr">{c.email}</TableCell>
                      <TableCell className="text-muted-foreground" dir="ltr">{c.phone ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{c.country}</TableCell>
                      <TableCell className="font-mono tabular-nums">{c._count.users}</TableCell>
                      <TableCell>{c.subscription?.plan.nameAr ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={companyStatus.variant}>{companyStatus.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.createdAt.toLocaleDateString("ar-EG")}</TableCell>
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
