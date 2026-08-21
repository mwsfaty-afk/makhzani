import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false, // يخفي ترويسة X-Powered-By: Next.js (تسريب معلومات بسيط عن التقنية المستخدمة)
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
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
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
