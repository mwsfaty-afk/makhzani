"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;
    import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", fontFamily: "sans-serif", textAlign: "center", padding: "1rem" }}>
          <p style={{ fontSize: "1.125rem", fontWeight: 600 }}>حدث خطأ غير متوقع</p>
          <p style={{ color: "#6b7280" }}>يرجى المحاولة مرة أخرى، وإذا تكررت المشكلة تواصل معنا عبر واتساب.</p>
          <button
            onClick={reset}
            style={{ borderRadius: "0.5rem", backgroundColor: "#2563eb", color: "#fff", padding: "0.5rem 1.25rem", border: "none", cursor: "pointer" }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
