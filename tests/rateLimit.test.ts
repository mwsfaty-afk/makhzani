import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { assertNotRateLimited, recordLoginAttempt, RateLimitedError } from "@/lib/auth/rateLimit";

describe("Brute-force protection on login (DB-backed, works across serverless instances)", () => {
  const identifier = `ratelimit_test_${Date.now()}@example.test`;

  afterEach(async () => {
    await prisma.loginAttempt.deleteMany({ where: { identifier } });
  });

  it("allows login attempts while under the failure threshold", async () => {
    for (let i = 0; i < 4; i++) {
      await recordLoginAttempt(identifier, false);
    }
    await expect(assertNotRateLimited(identifier)).resolves.toBeUndefined();
  });

  it("blocks further attempts once 5 failures accumulate within the window", async () => {
    for (let i = 0; i < 5; i++) {
      await recordLoginAttempt(identifier, false);
    }
    await expect(assertNotRateLimited(identifier)).rejects.toThrow(RateLimitedError);
  });

  it("a successful login attempt does not itself count toward the failure threshold", async () => {
    for (let i = 0; i < 4; i++) {
      await recordLoginAttempt(identifier, false);
    }
    await recordLoginAttempt(identifier, true);
    await expect(assertNotRateLimited(identifier)).resolves.toBeUndefined();
  });

  it("each identifier (email) has an independent counter — one account's lockout doesn't affect another", async () => {
    const otherIdentifier = `${identifier}_other`;
    for (let i = 0; i < 5; i++) {
      await recordLoginAttempt(identifier, false);
    }
    await expect(assertNotRateLimited(identifier)).rejects.toThrow(RateLimitedError);
    await expect(assertNotRateLimited(otherIdentifier)).resolves.toBeUndefined();
  });
});
