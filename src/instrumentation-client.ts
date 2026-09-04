import * as Sentry from "@sentry/nextjs";

/**
 * تنبيه أعطال بسيط — لا شيء يعمل بدون NEXT_PUBLIC_SENTRY_DSN (اختياري تمامًا،
 * المنصة تعمل بشكل طبيعي بدونه). القيمة تُؤخَذ من حساب Sentry مجاني خاص بصاحب
 * المنصة؛ راجع docs/MONITORING.md لخطوات التفعيل الكاملة.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tunnel: "/api/monitoring-tunnel",
    tracesSampleRate: 0,
  });
}
