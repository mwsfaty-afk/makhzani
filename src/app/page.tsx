import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getTrialDurationDays, getPublicPlans } from "@/lib/services/marketing/getPublicPlans";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Hero } from "@/components/marketing/Hero";
import { ValueStrip } from "@/components/marketing/ValueStrip";
import { Features } from "@/components/marketing/Features";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Pricing } from "@/components/marketing/Pricing";
import { FinalCta } from "@/components/marketing/FinalCta";
import { Faq, faqItems } from "@/components/marketing/Faq";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const TITLE = "مخزني | نظام وبرنامج إدارة المخازن والمخزون والمبيعات والمشتريات";
const DESCRIPTION =
  "مخزني نظام وبرنامج سحابي عربي لإدارة المخازن والمخزون والمبيعات والمشتريات والعملاء والموردين — بديل عملي لشيت إكسل المخازن، بصلاحيات دقيقة لكل موظف وحماية كاملة لخصوصية بياناتك. جرّبه مجانًا 14 يومًا بدون بطاقة ائتمانية.";
const KEYWORDS = [
  "برنامج مخازن",
  "نظام ادارة مخازن",
  "نظام مخازن",
  "برنامج ادارة مخزون",
  "نظام مخزون",
  "شيت اكسل مخازن",
  "برنامج مبيعات ومشتريات",
  "إدارة المخزون",
];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: KEYWORDS,
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

  const countryCode = (await headers()).get("x-vercel-ip-country") === "SA" ? "SA" : "EG";
  const [trialDays, plans] = await Promise.all([getTrialDurationDays(), getPublicPlans(countryCode)]);
  const cheapestPlan = plans.reduce((min, p) => (p.price < min.price ? p : min), plans[0]);

  const softwareAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "مخزني",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://mkhzny.com",
    description: DESCRIPTION,
    ...(cheapestPlan && {
      offers: {
        "@type": "Offer",
        price: String(cheapestPlan.price),
        priceCurrency: cheapestPlan.currency,
        priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
      },
    }),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems(trialDays).map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
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
