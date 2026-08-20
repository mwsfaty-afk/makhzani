import { requireTenant } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { QuickFormDialog } from "@/components/quick-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import { createWarehouse, deleteWarehouse } from "./actions";

export default async function WarehousesPage() {
  const { db } = await requireTenant();
  const warehouses = await db.warehouse.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>المخازن ({warehouses.length})</CardTitle>
        <QuickFormDialog
          triggerLabel="مخزن جديد"
          title="إضافة مخزن"
          action={createWarehouse}
          fields={[
            { type: "text", name: "code", label: "الكود", required: true },
            { type: "text", name: "name", label: "الاسم", required: true },
            { type: "text", name: "managerName", label: "المسؤول (اختياري)" },
            { type: "tel", name: "phone", label: "الهاتف (اختياري)" },
            { type: "text", name: "address", label: "العنوان (اختياري)" },
          ]}
        />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الكود</TableHead>
              <TableHead>الاسم</TableHead>
              <TableHead>المسؤول</TableHead>
              <TableHead>الهاتف</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.map((wh) => (
              <TableRow key={wh.id}>
                <TableCell className="font-mono text-sm">{wh.code}</TableCell>
                <TableCell className="font-medium">
                  {wh.name}
                  {wh.isDefault && (
                    <Badge variant="outline" className="ms-2">
                      افتراضي
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{wh.managerName ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{wh.phone ?? "—"}</TableCell>
                <TableCell>
                  <DeleteButton itemLabel={wh.name} action={deleteWarehouse.bind(null, wh.id)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
