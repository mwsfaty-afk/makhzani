import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminPromoCodesPage() {
  const codes = await prisma.promoCode.findMany({ orderBy: { createdAt: "desc" }, include: { plan: true } });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">أكواد الخصم</h1>
        <Button render={<Link href="/admin/promo-codes/new" />} size="sm">
          <Plus />
          كود جديد
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">كل الأكواد ({codes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead>
                <TableHead>الباقة</TableHead>
                <TableHead>المدة</TableHead>
                <TableHead>الاستخدام</TableHead>
                <TableHead>الانتهاء</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    لا توجد أكواد بعد
                  </TableCell>
                </TableRow>
              ) : (
                codes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-medium">
                      <Link href={`/admin/promo-codes/${c.id}`} className="hover:underline">
                        {c.code}
                      </Link>
                    </TableCell>
                    <TableCell>{c.plan.nameAr}</TableCell>
                    <TableCell className="font-mono tabular-nums">{c.durationDays} يوم</TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {c.redeemedCount} / {c.maxRedemptions}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.expiresAt ? c.expiresAt.toLocaleDateString("ar-EG") : "بلا حد"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? "default" : "outline"}>{c.isActive ? "مفعّل" : "معطَّل"}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
