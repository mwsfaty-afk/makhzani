import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CsvImportForm } from "@/components/csv-import-form";
import { importCustomersAction } from "../actions";

export default function ImportCustomersPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/dashboard/customers" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronRight className="size-4" />
        العملاء
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>استيراد عملاء من CSV</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            حمّل النموذج أدناه وعبّئه ببياناتك بنفس ترتيب الأعمدة (الكود، الاسم، الهاتف، البريد الإلكتروني،
            الرقم الضريبي، حد الائتمان، الرصيد الافتتاحي)، ثم ارفعه هنا. الحقول عدا الكود والاسم اختيارية.
          </p>
          <CsvImportForm action={importCustomersAction} templateHref="/api/customers/import-template" />
        </CardContent>
      </Card>
    </div>
  );
}
