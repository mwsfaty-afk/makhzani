"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Layers, Receipt, Settings, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { adminLogoutAction } from "./actions";

const links = [
  { href: "/admin/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/admin/companies", label: "الشركات", icon: Building2 },
  { href: "/admin/plans", label: "الخطط", icon: Layers },
  { href: "/admin/promo-codes", label: "أكواد الخصم", icon: Tag },
  { href: "/admin/payments", label: "المدفوعات", icon: Receipt },
  { href: "/admin/system-settings", label: "إعدادات النظام", icon: Settings },
];

export function AdminNav({ adminName }: { adminName: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Logo variant="mark" href={null} size="sm" />
            <span className="text-sm font-semibold">لوحة إدارة المنصة</span>
          </div>
          <nav className="flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                    active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <link.icon className="size-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{adminName}</span>
          <form action={adminLogoutAction}>
            <Button type="submit" variant="outline" size="sm">
              تسجيل الخروج
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
