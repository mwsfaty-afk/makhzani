import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { getConversionRate } from "@/lib/services/billing/pricing";

const TEST_CURRENCIES = ["XTS", "XTA"]; // رموز عملات اختبار ISO 4217 محجوزة، لا تصطدم بعملات حقيقية

describe("getConversionRate", () => {
  afterEach(async () => {
    await prisma.exchangeRateNote.deleteMany({ where: { baseCurrency: { in: TEST_CURRENCIES } } });
  });

  it("returns 1 when converting a currency to itself, without hitting the DB", async () => {
    await expect(getConversionRate("EGP", "EGP")).resolves.toBe(1);
  });

  it("returns null when no rate is stored in either direction", async () => {
    await expect(getConversionRate("XTS", "XTA")).resolves.toBeNull();
  });

  it("uses the direct rate when stored as (from → to)", async () => {
    await prisma.exchangeRateNote.create({ data: { baseCurrency: "XTS", targetCurrency: "XTA", rate: 14.25 } });
    await expect(getConversionRate("XTS", "XTA")).resolves.toBe(14.25);
  });

  it("inverts the rate when only stored as (to → from)", async () => {
    // لو الأدمن أدخل السعر بالاتجاه المعاكس (1 XTA = 0.1 XTS)، يجب أن يُقلَب صحيحًا
    await prisma.exchangeRateNote.create({ data: { baseCurrency: "XTA", targetCurrency: "XTS", rate: 0.1 } });
    const rate = await getConversionRate("XTS", "XTA");
    expect(rate).toBeCloseTo(10, 6);
  });
});
