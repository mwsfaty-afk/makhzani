import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/register`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/refund-policy`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
