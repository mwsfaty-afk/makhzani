import { Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="size-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" className="flex items-center gap-2 px-2" />}>
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">{initial}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{userName}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs font-normal text-muted-foreground">{roleName ?? "بدون دور"}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <SignOutMenuItem />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
