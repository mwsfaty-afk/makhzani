"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { approvePaymentAction, rejectPaymentAction } from "./actions";

export function PaymentReviewActions({ paymentId }: { paymentId: number }) {
  const [approving, startApprove] = useTransition();
  const [rejecting, startReject] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    startApprove(async () => {
      const res = await approvePaymentAction(paymentId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("تم اعتماد الدفعة وتفعيل الاشتراك");
    });
  }

  function handleReject() {
    setError(null);
    const formData = new FormData();
    formData.set("reason", reason);
    startReject(async () => {
      const res = await rejectPaymentAction(paymentId, formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      toast.success("تم رفض الدفعة");
      setOpen(false);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" disabled={approving} onClick={handleApprove}>
        {approving ? "جارٍ الاعتماد..." : "اعتماد"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button size="sm" variant="outline" />}>رفض</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض الدفعة</DialogTitle>
            <DialogDescription>اكتب سبب الرفض — سيظهر للشركة في سجل مدفوعاتها.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: رقم المرجع لا يطابق أي تحويل مستلم" />
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button disabled={rejecting} onClick={handleReject} className="bg-destructive text-white hover:bg-destructive/90">
              {rejecting ? "جارٍ الرفض..." : "تأكيد الرفض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
