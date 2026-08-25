"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

/**
 * زر مسح باركود اختياري بجانب حقل إدخال يدوي — لا يستبدل الإدخال اليدوي، فقط بديل أسرع
 * له. يعتمد على مكتبة @zxing/browser (بلا اتصال بأي خادم — كل المعالجة تتم محليًا داخل
 * المتصفح عبر كاميرا الجهاز)، ويُفضّل الكاميرا الخلفية (facingMode: environment) لأنها
 * الأنسب لمسح الباركود على الهواتف.
 */
export function BarcodeScannerButton({ onScan }: { onScan: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromConstraints({ video: { facingMode: "environment" } }, videoRef.current!, (result, _err, controls) => {
        controlsRef.current = controls;
        if (result && !cancelled) {
          cancelled = true;
          onScan(result.getText());
          controls.stop();
          setOpen(false);
        }
      })
      .catch(() => {
        if (!cancelled) setError("تعذّر الوصول إلى الكاميرا — تأكد من منح إذن الكاميرا للموقع، أو أدخل الباركود يدويًا.");
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onScan]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        aria-label="مسح الباركود بالكاميرا"
      >
        <ScanLine className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>مسح الباركود</DialogTitle>
            <DialogDescription>وجّه الكاميرا نحو الباركود — سيُقرأ تلقائيًا فور وضوحه.</DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : (
            <video ref={videoRef} className="aspect-video w-full rounded-lg bg-black object-cover" muted playsInline />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
