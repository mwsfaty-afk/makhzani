import { requirePlatformAdmin } from "@/lib/auth/adminSession";
import { AdminNav } from "./AdminNav";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminNav adminName={admin.name} />
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}
