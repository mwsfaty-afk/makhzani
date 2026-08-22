import Link from "next/link";
import { Bell, Settings } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SignOutMenuItem } from "@/components/SignOutButton";

export function Topbar({
  userName,
  roleName,
  subscriptionLabel,
}: {
  userName: string;
  roleName: string | null;
  subscriptionLabel: string;
}) {
  const initial = userName.trim().charAt(0).toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {subscriptionLabel}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" className="text-muted-foreground" disabled aria-label="الإشعارات (قريبًا)" />}
          >
            <Bell className="size-4" />
          </TooltipTrigger>
          <TooltipContent>الإشعارات — قريبًا</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" className="flex items-center gap-2 px-2" />}>
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">{initial}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{userName}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs font-normal text-muted-foreground">{roleName ?? "بدون دور"}</p>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
              <Settings />
              الإعدادات
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <SignOutMenuItem />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
