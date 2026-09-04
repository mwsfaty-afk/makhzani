"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ImportResult = { created: number; errors: { row: number; message: string }[]; stoppedEarly: boolean };

export function CsvImportForm({
  action,
  templateHref,
}: {
  action: (formData: FormData) => Promise<{ error: string } | ImportResult>;
  templateHref: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await action(formData);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setResult(res);
      formRef.current?.reset();
      if (res.created > 0) toast.success(`تم استيراد ${res.created} صفًا بنجاح`);
      if (res.errors.length > 0 && res.created === 0) toast.error("لم يتم استيراد أي صف — راجع الأخطاء أدناه");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <a href={templateHref} className="w-fit text-sm text-primary underline">
        تحميل نموذج CSV
      </a>

      <form ref={formRef} action={handleSubmit} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="text-sm file:me-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "جارٍ الاستيراد..." : "استيراد"}
        </Button>
      </form>

      {result && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4 text-sm">
          <p>
            تم إنشاء <span className="font-semibold text-success">{result.created}</span> صفًا بنجاح
            {result.errors.length > 0 && (
              <>
                {" "}
                — <span className="font-semibold text-destructive">{result.errors.length}</span> صف به مشكلة
              </>
            )}
          </p>
          {result.stoppedEarly && (
            <p className="text-destructive">توقف الاستيراد قبل انتهاء الملف بسبب الوصول لحد خطتك الحالية.</p>
          )}
          {result.errors.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">الصف</TableHead>
                  <TableHead>السبب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.errors.map((e) => (
                  <TableRow key={e.row}>
                    <TableCell className="font-mono tabular-nums">{e.row}</TableCell>
                    <TableCell className="text-muted-foreground">{e.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
