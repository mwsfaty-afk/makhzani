import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // لوحات التطبيق الموثَّق دخولها لا تخص محركات البحث — لا فائدة تسويقية من فهرستها،
      // وقد تحمل عناوين URL بمعرّفات داخلية (شركات/فواتير) لا يجب أن تظهر في نتائج البحث.
      disallow: ["/dashboard", "/dashboard/*", "/omar", "/omar/*", "/api/*"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
