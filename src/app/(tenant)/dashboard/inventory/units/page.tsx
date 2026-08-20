import { requireTenant } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QuickFormDialog } from "@/components/quick-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import { createUnit, deleteUnit } from "./actions";

export default async function UnitsPage() {
  const { db } = await requireTenant();
  const units = await db.unit.findMany({ orderBy: { name: "asc" } });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>الوحدات ({units.length})</CardTitle>
        <QuickFormDialog
          triggerLabel="وحدة جديدة"
          title="إضافة وحدة"
          description="مثال: قطعة، كرتونة، كيلوجرام"
          action={createUnit}
          fields={[
            { type: "text", name: "nameAr", label: "الاسم بالعربية", required: true },
            { type: "text", name: "name", label: "الاسم بالإنجليزية", required: true },
          ]}
        />
      </CardHeader>
      <CardContent>
        {units.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">لا توجد وحدات بعد</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم بالعربية</TableHead>
                <TableHead>الاسم بالإنجليزية</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.nameAr}</TableCell>
                  <TableCell className="text-muted-foreground">{unit.name}</TableCell>
                  <TableCell>
                    <DeleteButton itemLabel={unit.nameAr} action={deleteUnit.bind(null, unit.id)} />
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
