import { requireTenant } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QuickFormDialog } from "@/components/quick-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import { createSupplier, deleteSupplier } from "./actions";

export default async function SuppliersPage() {
  const { db } = await requireTenant();
  const suppliers = await db.supplier.findMany({ orderBy: { name: "asc" } });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>الموردون ({suppliers.length})</CardTitle>
        <QuickFormDialog
          triggerLabel="مورد جديد"
          title="إضافة مورد"
          action={createSupplier}
          fields={[
            { type: "text", name: "code", label: "الكود", required: true },
            { type: "text", name: "name", label: "الاسم", required: true },
            { type: "tel", name: "phone", label: "الهاتف (اختياري)" },
            { type: "email", name: "email", label: "البريد الإلكتروني (اختياري)" },
            { type: "text", name: "taxNumber", label: "الرقم الضريبي (اختياري)" },
            { type: "number", name: "creditLimit", label: "حد الائتمان (اختياري)" },
            { type: "number", name: "openingBalance", label: "الرصيد الافتتاحي (اختياري)" },
          ]}
        />
      </CardHeader>
      <CardContent>
        {suppliers.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">لا يوجد موردون بعد</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>حد الائتمان</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm">{s.code}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.phone ?? "—"}</TableCell>
                  <TableCell className="font-mono tabular-nums text-muted-foreground">
                    {s.creditLimit.toString()}
                  </TableCell>
                  <TableCell>
                    <DeleteButton itemLabel={s.name} action={deleteSupplier.bind(null, s.id)} />
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
