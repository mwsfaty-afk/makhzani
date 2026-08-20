import { requireTenant } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QuickFormDialog } from "@/components/quick-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import { createBrand, deleteBrand } from "./actions";

export default async function BrandsPage() {
  const { db } = await requireTenant();
  const brands = await db.brand.findMany({ orderBy: { name: "asc" } });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>العلامات التجارية ({brands.length})</CardTitle>
        <QuickFormDialog
          triggerLabel="علامة تجارية جديدة"
          title="إضافة علامة تجارية"
          action={createBrand}
          fields={[{ type: "text", name: "name", label: "الاسم", required: true }]}
        />
      </CardHeader>
      <CardContent>
        {brands.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">لا توجد علامات تجارية بعد</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell>
                    <DeleteButton itemLabel={brand.name} action={deleteBrand.bind(null, brand.id)} />
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
