import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";

/**
 * اختبار حقيقي على مستوى HTTP فوق التطبيق المبني فعليًا (`next start`) — وليس فحصًا على
 * مستوى الكود فقط. هذا يثبت أن حماية `/admin/**` و`/dashboard/**` تتم من الخادم نفسه (عبر
 * `requirePlatformAdmin()`/`requireTenant()` في الـ layout/page)، وليست مجرد إخفاء أزرار في
 * الواجهة — طلب مباشر بلا كوكيز جلسة يجب أن يُعاد توجيهه دائمًا، مهما كان الرابط.
 */
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

let server: ChildProcess;

async function waitForServer(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/login`, { redirect: "manual" });
      if (res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Server did not become ready in time");
}

describe("Server-side route protection (HTTP-level, not just UI hiding)", () => {
  beforeAll(async () => {
    server = spawn("npx", ["next", "start", "-p", String(PORT)], {
      cwd: process.cwd(),
      shell: true,
      stdio: "ignore",
    });
    await waitForServer();
  }, 90000);

  afterAll(async () => {
    if (!server || !server.pid) return;
    // على ويندوز، spawn(..., {shell:true}) يجعل server.kill() يقتل غلاف الصَّدَفة (cmd.exe)
    // فقط دون عملية next-server الفعلية تحته — تبقى معلَّقة، تحجز اتصالات Supabase Pooler،
    // وتُفشل ملفات الاختبار التالية بأخطاء "Can't reach database server" غامضة الصلة.
    // taskkill /T يقتل شجرة العمليات بالكامل بدل عملية الغلاف فقط.
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"]);
    } else {
      server.kill("SIGKILL");
    }
    await new Promise((r) => setTimeout(r, 500));
  });

  it("GET /admin/dashboard with no session cookie redirects to /admin/login, never renders admin content", async () => {
    const res = await fetch(`${BASE_URL}/admin/dashboard`, { redirect: "manual" });
    expect([302, 307, 303]).toContain(res.status);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/admin/login");
  });

  it("GET /admin/companies with no session cookie redirects to /admin/login", async () => {
    const res = await fetch(`${BASE_URL}/admin/companies`, { redirect: "manual" });
    expect([302, 307, 303]).toContain(res.status);
    expect(res.headers.get("location") ?? "").toContain("/admin/login");
  });

  it("GET /admin/plans with no session cookie redirects to /admin/login", async () => {
    const res = await fetch(`${BASE_URL}/admin/plans`, { redirect: "manual" });
    expect([302, 307, 303]).toContain(res.status);
    expect(res.headers.get("location") ?? "").toContain("/admin/login");
  });

  it("GET /dashboard with no tenant session cookie redirects to /login", async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: "manual" });
    expect([302, 307, 303]).toContain(res.status);
    expect(res.headers.get("location") ?? "").toContain("/login");
  });

  it("GET /dashboard/billing with no session cookie redirects to /login, not the billing page", async () => {
    const res = await fetch(`${BASE_URL}/dashboard/billing`, { redirect: "manual" });
    expect([302, 307, 303]).toContain(res.status);
    expect(res.headers.get("location") ?? "").toContain("/login");
  });

  it("GET a nonexistent payment's proof file returns 404, not a 500 or leaked data", async () => {
    const res = await fetch(`${BASE_URL}/api/billing/payments/999999999/proof`, { redirect: "manual" });
    expect(res.status).toBe(404);
  });

  it("security headers are present on a normal response", async () => {
    const res = await fetch(`${BASE_URL}/login`, { redirect: "manual" });
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("content-security-policy")).toBeTruthy();
  });
});
