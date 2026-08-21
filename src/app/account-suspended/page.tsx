"use client";

import { signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AccountSuspendedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <CardTitle>حساب الشركة معطَّل حاليًا</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <p>
            تم إيقاف الوصول إلى حساب شركتك مؤقتًا من قِبل إدارة المنصة. إن كنت تعتقد أن هذا خطأ، أو
            ترغب في إعادة التفعيل، يرجى التواصل مع الدعم.
          </p>
          <Button onClick={() => signOut({ callbackUrl: "/login" })}>تسجيل الخروج</Button>
        </CardContent>
      </Card>
    </main>
  );
}
