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
import { postStockOrderAction, deleteStockOrderDraftAction } from "../actions";

export function StockOrderStatusActions({ orderId, status }: { orderId: number; status: string }) {
  const [pending, startTransition] = useTransition();

  function handlePost() {
    startTransition(async () => {
      const res = await postStockOrderAction(orderId);
      if (res?.error) toast.error(res.error);
      else toast.success("تم اعتماد الأمر — تم تحديث المخزون فعليًا");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteStockOrderDraftAction(orderId);
      if (res?.error) toast.error(res.error);
    });
  }

  if (status !== "DRAFT") return null;

  return (
    <div className="flex items-center gap-2">
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="outline" disabled={pending} />}>حذف المسودة</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف مسودة الأمر؟</AlertDialogTitle>
            <AlertDialogDescription>لا يوجد أثر على المخزون بعد لأن الأمر لم يُعتمَد — سيُحذف نهائيًا.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              {pending ? "جارٍ الحذف..." : "تأكيد الحذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button onClick={handlePost} disabled={pending}>
        {pending ? "جارٍ الاعتماد..." : "اعتماد الأمر"}
      </Button>
    </div>
  );
}
