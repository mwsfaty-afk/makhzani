import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/brand/Logo";

const NAV_LINKS = [
  { href: "#features", label: "المميزات" },
  { href: "#how-it-works", label: "كيف يعمل" },
  { href: "#pricing", label: "الباقات" },
  { href: "#faq", label: "الأسئلة الشائعة" },
];

const PAYMENT_LOGOS = [
  { src: "/payment-logos/visa.svg", alt: "Visa", width: 52, height: 17 },
  { src: "/payment-logos/paypal.png", alt: "PayPal", width: 74, height: 20 },
  { src: "/payment-logos/vodafone-cash.svg", alt: "Vodafone Cash", width: 28, height: 28 },
  { src: "/payment-logos/al-rajhi.svg", alt: "مصرف الراجحي", width: 60, height: 21 },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-xs flex-col gap-3">
          <Logo />
          <p className="text-sm leading-relaxed text-muted-foreground">
            منصة عربية لإدارة المخزون والمبيعات والمشتريات والعملاء والموردين والتقارير من مكان واحد.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex gap-3 text-sm font-medium">
          <Link href="/login" className="rounded-lg px-4 py-2 hover:bg-muted">
            تسجيل الدخول
          </Link>
          <Link href="/register" className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
            ابدأ مجانًا
          </Link>
        </div>
      </div>

      <div className="border-t border-border px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3">
          <p className="text-xs text-muted-foreground">طرق دفع آمنة وموثوقة</p>
          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 opacity-80">
            {PAYMENT_LOGOS.map((logo) => (
              <Image key={logo.alt} src={logo.src} alt={logo.alt} width={logo.width} height={logo.height} className="h-auto max-h-6 w-auto" />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5 border-t border-border px-4 py-5 text-center text-xs text-muted-foreground sm:px-6">
        <p>© {new Date().getFullYear()} مخزني. جميع الحقوق محفوظة.</p>
        <p>
          تمت البرمجة والتصميم بواسطة{" "}
          <a
            href="https://www.gafar.net"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            شركة جعفر.نت
          </a>
        </p>
      </div>
    </footer>
  );
}
