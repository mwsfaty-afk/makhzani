import Link from "next/link";
import { Logo } from "./Logo";

const NAV_LINKS = [
  { href: "#features", label: "المميزات" },
  { href: "#how-it-works", label: "كيف يعمل" },
  { href: "#pricing", label: "الباقات" },
  { href: "#faq", label: "الأسئلة الشائعة" },
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

      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} مخزني. جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}
