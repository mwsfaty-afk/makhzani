import Link from "next/link";
import { requireTenant } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { DeleteButton } from "@/components/delete-button";
import { deleteItem } from "./actions";

export default async function ItemsPage() {
  const { db } = await requireTenant();
  const items = await db.item.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true, brand: true, baseUnit: true },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>الأصناف ({items.length})</CardTitle>
        <Button render={<Link href="/dashboard/inventory/items/new" />} size="sm">
          <Plus />
          صنف جديد
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">لا توجد أصناف بعد</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>المجموعة</TableHead>
                <TableHead>الوحدة</TableHead>
                <TableHead>سعر البيع</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.code}</TableCell>
                  <TableCell className="font-medium">
                    {item.nameAr}
                    {!item.isActive && (
                      <Badge variant="outline" className="ms-2">
                        غير مفعّل
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.category?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{item.baseUnit.nameAr}</TableCell>
                  <TableCell className="font-mono tabular-nums">{item.salePrice.toString()}</TableCell>
                  <TableCell>
                    <DeleteButton itemLabel={item.nameAr ?? item.name} action={deleteItem.bind(null, item.id)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
