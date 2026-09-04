/**
 * نفق (Tunnel) لأحداث Sentry — بدل ما يرسل المتصفح تقارير الأعطال مباشرة لسيرفرات
 * Sentry (مما يتطلب فتح Content-Security-Policy على نطاق خارجي وقد يُحجَب بأدوات
 * حجب الإعلانات)، يرسلها لنفس نطاقنا هنا، ومن هنا فقط نعيد توجيهها لـSentry. الوجهة
 * تُشتق دائمًا من DSN المُهيَّأ على السيرفر (وليس من أي بيانات قادمة من الطلب نفسه) —
 * لمنع استخدام هذا المسار كوسيط مفتوح (SSRF) لإرسال طلبات لأي نطاق خارجي آخر.
 */
export async function POST(request: Request) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return new Response(null, { status: 404 });

  let projectId: string;
  let host: string;
  try {
    const url = new URL(dsn);
    host = url.host;
    projectId = url.pathname.replace(/^\//, "");
    if (!host || !projectId) throw new Error("invalid dsn");
  } catch {
    return new Response(null, { status: 500 });
  }

  const body = await request.text();
  try {
    const res = await fetch(`https://${host}/api/${projectId}/envelope/`, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-sentry-envelope" },
    });
    return new Response(null, { status: res.status });
  } catch {
    return new Response(null, { status: 502 });
  }
}
