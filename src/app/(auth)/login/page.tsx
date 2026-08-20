"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });

    setPending(false);
    if (res?.error) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold">تسجيل الدخول</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">البريد الإلكتروني</span>
          <input
            name="email"
            type="email"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">كلمة المرور</span>
          <input
            name="password"
            type="password"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </label>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "جارٍ الدخول..." : "دخول"}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-500">
        ليس لديك حساب؟{" "}
        <Link href="/register" className="font-medium text-neutral-900 underline">
          أنشئ حساب شركة
        </Link>
      </p>
    </main>
  );
}
