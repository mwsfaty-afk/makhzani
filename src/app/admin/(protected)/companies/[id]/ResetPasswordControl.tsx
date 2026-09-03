"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { resetCompanyOwnerPasswordAction } from "../actions";

export function ResetPasswordControl({ companyId }: { companyId: number }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ tempPassword: string; ownerEmail: string } | null>(null);

  function handleReset() {
    startTransition(async () => {
      const res = await resetCompanyOwnerPasswordAction(companyId);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setResult({ tempPassword: res.tempPassword, ownerEmail: res.ownerEmail });
    });
  }

  function copyPassword() {
    if (!result) return;
    navigator.clipboard.writeText(result.tempPassword);
    toast.success("تم نسخ كلمة المرور");
  }

  if (result) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
        <p className="text-muted-foreground">
          كلمة مرور مؤقتة جديدة لحساب <span dir="ltr">{result.ownerEmail}</span> — أبلغ العميل بها الآن،
          لن تظهر مرة أخرى:
        </p>
        <div className="flex items-center gap-2">
          <code dir="ltr" className="flex-1 rounded-md bg-background px-3 py-2 font-mono text-base">
            {result.tempPassword}
          </code>
          <Button type="button" variant="outline" size="icon" onClick={copyPassword}>
            <Copy className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" disabled={pending} />}>
        إعادة تعيين كلمة المرور
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>إعادة تعيين كلمة مرور مالك الحساب؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم إنشاء كلمة مرور عشوائية جديدة وإبطال القديمة فورًا. ستظهر لك مرة واحدة فقط بعد
            التأكيد لإبلاغ العميل بها.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={handleReset}>
            {pending ? "جارٍ الإنشاء..." : "إعادة التعيين"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
