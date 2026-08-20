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
import { postSaleAction, cancelSaleAction } from "../actions";

export function SaleStatusActions({ saleId, status }: { saleId: number; status: string }) {
  const [pending, startTransition] = useTransition();

  function handlePost() {
    startTransition(async () => {
      const res = await postSaleAction(saleId);
      if (res?.error) toast.error(res.error);
      else toast.success("تم اعتماد الفاتورة — تم تحديث المخزون ورصيد العميل والربح");
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelSaleAction(saleId);
      if (res?.error) toast.error(res.error);
      else toast.success("تم إلغاء الفاتورة وعكس أثرها بالكامل");
    });
  }

  if (status === "DRAFT") {
    return (
      <Button onClick={handlePost} disabled={pending}>
        {pending ? "جارٍ الاعتماد..." : "اعتماد الفاتورة"}
      </Button>
    );
  }

  if (status === "POSTED") {
    return (
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="outline" />}>إلغاء الفاتورة</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء فاتورة البيع؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم عكس أثرها بالكامل على المخزون ورصيد العميل والخزينة. لن يتم حذف الفاتورة نفسها.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={handleCancel} className="bg-destructive text-white hover:bg-destructive/90">
              {pending ? "جارٍ الإلغاء..." : "تأكيد الإلغاء"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return null;
}
