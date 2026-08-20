"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function SignOutButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
      تسجيل الخروج
    </Button>
  );
}

export function SignOutMenuItem() {
  return (
    <DropdownMenuItem variant="destructive" onClick={() => signOut({ callbackUrl: "/login" })}>
      <LogOut />
      تسجيل الخروج
    </DropdownMenuItem>
  );
}
