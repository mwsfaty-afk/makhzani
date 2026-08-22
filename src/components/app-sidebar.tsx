"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Boxes,
  Users,
  Building2,
  Wallet,
  BarChart3,
  Settings,
  Package,
  Tags,
  Ruler,
  Warehouse,
  Award,
  ClipboardList,
  ArrowLeftRight,
  ClipboardCheck,
  CreditCard,
  ListOrdered,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/brand/Logo";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; disabled?: boolean };

const inventoryLinks: NavItem[] = [
  { href: "/dashboard/inventory/stock", label: "أرصدة المخزون", icon: ClipboardList },
  { href: "/dashboard/inventory/stock-orders", label: "أوامر التوريد والصرف", icon: ListOrdered },
  { href: "/dashboard/inventory/transfers", label: "التحويلات", icon: ArrowLeftRight },
  { href: "/dashboard/inventory/stock-take", label: "الجرد", icon: ClipboardCheck },
  { href: "/dashboard/inventory/items", label: "الأصناف", icon: Package },
  { href: "/dashboard/inventory/categories", label: "المجموعات", icon: Tags },
  { href: "/dashboard/inventory/brands", label: "العلامات التجارية", icon: Award },
  { href: "/dashboard/inventory/units", label: "الوحدات", icon: Ruler },
  { href: "/dashboard/inventory/warehouses", label: "المخازن", icon: Warehouse },
];

const mainLinks: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/dashboard/sales", label: "المبيعات", icon: ShoppingCart },
  { href: "/dashboard/purchases", label: "المشتريات", icon: Truck },
];

const bottomLinks: NavItem[] = [
  { href: "/dashboard/customers", label: "العملاء", icon: Users },
  { href: "/dashboard/suppliers", label: "الموردون", icon: Building2 },
  { href: "/dashboard/cash", label: "الخزينة", icon: Wallet },
  { href: "/dashboard/reports", label: "التقارير", icon: BarChart3 },
  { href: "/dashboard/billing", label: "الفوترة والاشتراك", icon: CreditCard },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];

export function AppSidebar({ companyName }: { companyName: string }) {
  const pathname = usePathname();

  return (
    <Sidebar side="right" collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2 px-1">
          <Logo variant="mark" href={null} size="md" />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{companyName}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
              Makhzani
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainLinks.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.disabled ? "#" : item.href} />}
                    isActive={pathname === item.href}
                    disabled={item.disabled}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>المخزون</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/dashboard/inventory" />} isActive={pathname === "/dashboard/inventory"}>
                  <Boxes />
                  <span>إدارة المخزون</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {inventoryLinks.map((item) => (
                    <SidebarMenuSubItem key={item.href}>
                      <SidebarMenuSubButton
                        render={<Link href={item.href} />}
                        isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomLinks.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.disabled ? "#" : item.href} />}
                    isActive={pathname === item.href}
                    disabled={item.disabled}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
