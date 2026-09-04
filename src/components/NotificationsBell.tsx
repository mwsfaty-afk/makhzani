"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/lib/services/notifications/notificationActions";

type NotificationRow = {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
};

function timeAgo(date: Date): string {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return "الآن";
  if (diffMinutes < 60) return `منذ ${diffMinutes.toLocaleString("ar")} دقيقة`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `منذ ${diffHours.toLocaleString("ar")} ساعة`;
  const diffDays = Math.floor(diffHours / 24);
  return `منذ ${diffDays.toLocaleString("ar")} يوم`;
}

export function NotificationsBell({ notifications, unreadCount }: { notifications: NotificationRow[]; unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleItemClick(id: number, isRead: boolean) {
    if (!isRead) startTransition(() => markNotificationReadAction(id));
    setOpen(false);
  }

  function handleMarkAllRead() {
    startTransition(() => markAllNotificationsReadAction());
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative text-muted-foreground" aria-label="الإشعارات" />}>
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <Badge variant="destructive" className="absolute -top-1 -end-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] tabular-nums">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <p className="text-sm font-medium">الإشعارات</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" disabled={pending} onClick={handleMarkAllRead}>
              <CheckCheck className="size-3.5" />
              تحديد الكل كمقروء
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
            <BellOff className="size-6" />
            لا توجد إشعارات حاليًا
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                render={<Link href={n.link ?? "/dashboard"} />}
                onClick={() => handleItemClick(n.id, n.isRead)}
                className="flex flex-col items-start gap-0.5 whitespace-normal py-2.5"
              >
                <div className="flex w-full items-center gap-1.5">
                  {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  <span className={n.isRead ? "text-sm text-muted-foreground" : "text-sm font-medium"}>{n.title}</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{n.message}</p>
                <span className="text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
