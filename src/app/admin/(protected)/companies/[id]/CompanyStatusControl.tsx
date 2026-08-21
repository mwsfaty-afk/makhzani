"use client";

import { useTransition } from "react";
import { toast } from "sonner";
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
import { setCompanyStatusAction } from "../actions";

export function CompanyStatusControl({ companyId, status, companyName }: { companyId: number; status: string; companyName: string }) {
  const [pending, startTransition] = useTransition();

  function setStatus(next: string) {
    startTransition(async () => {
      const res = await setCompanyStatusAction(companyId, next);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(next === "ACTIVE" ? "تم تفعيل الشركة" : next === "SUSPENDED" ? "تم تعطيل الشركة" : "تم إلغاء الشركة");
    });
  }

  if (status === "ACTIVE") {
    return (
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" disabled={pending} />}>تعطيل الشركة</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تعطيل {companyName}؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيُمنع جميع مستخدمي هذه الشركة من تسجيل الدخول فورًا، وأي جلسة مفتوحة بالفعل ستُقطع عند
              أول طلب لاحق. يمكن التراجع عن هذا بالتفعيل مرة أخرى.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => setStatus("SUSPENDED")}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {pending ? "جارٍ التعطيل..." : "تعطيل"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Button disabled={pending} onClick={() => setStatus("ACTIVE")}>
      {pending ? "جارٍ التفعيل..." : "إعادة تفعيل الشركة"}
    </Button>
  );
}
