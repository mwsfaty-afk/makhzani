import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "مخزني — نظام إدارة المخزون والمبيعات والمشتريات",
    short_name: "مخزني",
    description: "نظام وبرنامج سحابي لإدارة المخازن والمخزون والمبيعات والمشتريات والعملاء والموردين.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#2563EB",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
