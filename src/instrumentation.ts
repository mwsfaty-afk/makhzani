import type { Instrumentation } from "next";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** تُستدعى مرة واحدة عند بدء تشغيل السيرفر — تهيّئ Sentry لكل من بيئتي Node وEdge. */
export async function register() {
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({ dsn, environment: process.env.NODE_ENV, tracesSampleRate: 0 });
  } else if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({ dsn, environment: process.env.NODE_ENV, tracesSampleRate: 0 });
  }
}

/** يلتقط أعطال السيرفر (Server Components وRoute Handlers وServer Actions) ويرسلها
 * لـSentry — يعمل تلقائيًا مع النظام الجديد في Next.js لتتبع الأخطاء (بديل try/catch
 * يدوي في كل مسار). بدون تأثير إن لم يكن DSN مضبوطًا. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (!dsn) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
};
