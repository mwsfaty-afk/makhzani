import type { Metadata } from "next";
import { Tajawal, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { WhatsAppSupportButton } from "@/components/WhatsAppSupportButton";

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "مخزني — نظام إدارة المخزون والمبيعات والمشتريات",
    template: "%s | مخزني",
  },
  description: "نظام SaaS لإدارة المخازن والمبيعات والمشتريات",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={cn("h-full", "antialiased", tajawal.variable, plexMono.variable)}>
      <body className="min-h-full flex flex-col font-sans">
        <TooltipProvider>
          {children}
          <WhatsAppSupportButton />
          <Toaster position="top-center" richColors dir="rtl" />
        </TooltipProvider>
      </body>
    </html>
  );
}
