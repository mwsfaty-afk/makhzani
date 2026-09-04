import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CsvImportForm } from "@/components/csv-import-form";
import { importItemsAction } from "../actions";

export default function ImportItemsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/dashboard/inventory/items" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronRight className="size-4" />
        الأصناف
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>استيراد أصناف من CSV</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            حمّل النموذج أدناه وعبّئه ببياناتك بنفس ترتيب الأعمدة (الكود، الاسم بالعربية، الاسم بالإنجليزية،
            الوحدة، المجموعة، العلامة التجارية، سعر الشراء، سعر البيع)، ثم ارفعه هنا. إذا لم تكن الوحدة أو
            المجموعة أو العلامة التجارية موجودة مسبقًا، سيتم إنشاؤها تلقائيًا. الاسم بالإنجليزية والمجموعة
            والعلامة التجارية وأسعار الشراء/البيع اختيارية.
          </p>
          <CsvImportForm action={importItemsAction} templateHref="/api/inventory/items/import-template" />
        </CardContent>
      </Card>
    </div>
  );
}
