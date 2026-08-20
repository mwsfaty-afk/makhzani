import { requireTenant } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QuickFormDialog } from "@/components/quick-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import { createCategory, deleteCategory } from "./actions";

export default async function CategoriesPage() {
  const { db } = await requireTenant();
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { parent: true },
  });

  const parentOptions = [
    { value: "none", label: "بدون (مجموعة رئيسية)" },
    ...categories.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>المجموعات ({categories.length})</CardTitle>
        <QuickFormDialog
          triggerLabel="مجموعة جديدة"
          title="إضافة مجموعة"
          action={createCategory}
          fields={[
            { type: "text", name: "name", label: "الاسم", required: true },
            { type: "select", name: "parentId", label: "المجموعة الأب", defaultValue: "none", options: parentOptions },
          ]}
        />
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">لا توجد مجموعات بعد</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>المجموعة الأب</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-muted-foreground">{cat.parent?.name ?? "—"}</TableCell>
                  <TableCell>
                    <DeleteButton itemLabel={cat.name} action={deleteCategory.bind(null, cat.id)} />
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
