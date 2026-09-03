import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getTrialDurationDays } from "@/lib/services/marketing/getPublicPlans";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Hero } from "@/components/marketing/Hero";
import { ValueStrip } from "@/components/marketing/ValueStrip";
import { Features } from "@/components/marketing/Features";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Pricing } from "@/components/marketing/Pricing";
import { FinalCta } from "@/components/marketing/FinalCta";
import { Faq } from "@/components/marketing/Faq";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const TITLE = "مخزني — نظام إدارة المخزون والمبيعات والمشتريات للشركات";
const DESCRIPTION =
  "منصة عربية لإدارة المخزون والمبيعات والمشتريات والعملاء والموردين والخزينة والتقارير من لوحة تحكم واحدة، بصلاحيات دقيقة لكل موظف وحماية كاملة لخصوصية بياناتك.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "مخزني",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }

  const trialDays = await getTrialDurationDays();

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        <Hero trialDays={trialDays} />
        <ValueStrip />
        <Features />
        <HowItWorks />
        <Pricing />
        <Faq trialDays={trialDays} />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
