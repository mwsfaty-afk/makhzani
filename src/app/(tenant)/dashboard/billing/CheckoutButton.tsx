"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startCheckoutAction } from "./actions";

export function CheckoutButton({ planId, gatewayCode, label, variant }: { planId: number; gatewayCode: string; label: string; variant: "default" | "outline" }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const res = await startCheckoutAction(planId, gatewayCode);
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <Button type="button" variant={variant} className="w-full" disabled={pending} onClick={handleClick}>
      {pending ? "جارٍ التحويل..." : label}
    </Button>
  );
}
