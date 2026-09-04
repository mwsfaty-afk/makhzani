import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminPlansPage() {
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { subscriptions: true } } } });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">الخطط</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">كل الخطط ({plans.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الخطة</TableHead>
                <TableHead>السعر الافتراضي</TableHead>
                <TableHead>المستخدمون</TableHead>
                <TableHead>المخازن</TableHead>
                <TableHead>الأصناف</TableHead>
                <TableHead>عدد المشتركين</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/plans/${p.id}`} className="hover:underline">
                      {p.nameAr}
                    </Link>
                    <span className="ms-2 font-mono text-xs text-muted-foreground">{p.code}</span>
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {Number(p.price).toLocaleString("ar")} {p.currency}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">{p.maxUsers}</TableCell>
                  <TableCell className="font-mono tabular-nums">{p.maxWarehouses}</TableCell>
                  <TableCell className="font-mono tabular-nums">{p.maxItems.toLocaleString("ar")}</TableCell>
                  <TableCell className="font-mono tabular-nums">{p._count.subscriptions}</TableCell>
                  <TableCell className="flex gap-1">
                    <Badge variant={p.isActive ? "default" : "outline"}>{p.isActive ? "مفعّلة" : "معطَّلة"}</Badge>
                    {!p.isPublic && <Badge variant="secondary">غير معلنة</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
