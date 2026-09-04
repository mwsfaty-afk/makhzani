import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false, // يخفي ترويسة X-Powered-By: Next.js (تسريب معلومات بسيط عن التقنية المستخدمة)
  async redirects() {
    // نطاق Vercel الافتراضي (*.vercel.app) يبقى شغالًا دائمًا بجانب أي دومين مخصَّص يُضاف
    // للمشروع — لا يتوقف ولا يتحول تلقائيًا. تحويل 301 هنا يمنع ظهور الموقع بنطاقين مختلفين
    // (محتوى مكرر يشتت قوة الترتيب في محركات البحث بين الرابطين) ويوجّه أي زائر بالرابط
    // القديم للهوية الرسمية الجديدة mkhzny.com.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "makhzani-sa.vercel.app" }],
        destination: "https://mkhzny.com/:path*",
        permanent: true,
      },
    ];
  },
  experimental: {
    serverActions: {
      // إثبات الدفع (صورة/PDF) محدود بـ 5 ميجابايت في submitManualProof.ts — الحد الافتراضي
      // لـ Server Actions هو 1MB فقط، وكان سيرفض حتى الملفات الصالحة قبل وصولها لمنطق التحقق.
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    // CSP معتدلة عمدًا (unsafe-inline/unsafe-eval) — Next.js/Tailwind/Base UI تحتاجها
    // في وضعها الحالي بدون nonce مخصص؛ تشديدها لاحقًا خطوة منفصلة تحتاج اختبارًا موسّعًا.
    // نطاقا googletagmanager.com وgoogle-analytics.com مضافان لـGoogle Analytics (GA4، عبر
    // GoogleAnalytics من @next/third-parties) — بدونهما CSP يمنع تحميل gtag.js نفسه وأي
    // طلب إرسال بيانات له، ويفشل التتبع بصمت دون أي رسالة خطأ واضحة للمستخدم.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
