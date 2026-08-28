import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createTestCompany, deleteTestCompany } from "./helpers/testCompany";
import {
  redeemPromoCode,
  PromoCodeInvalidError,
  PromoCodeExhaustedError,
  PromoCodeAlreadyUsedError,
} from "@/lib/services/billing/redeemPromoCode";

describe("Promo codes", () => {
  let companyAId: number;
  let companyBId: number;
  let companyCId: number;
  let promoId: number;
  let basicPlanId: number;

  beforeAll(async () => {
    const [a, b, c, basicPlan] = await Promise.all([
      createTestCompany(),
      createTestCompany(),
      createTestCompany(),
      prisma.plan.findUniqueOrThrow({ where: { code: "basic" } }),
    ]);
    companyAId = a.companyId;
    companyBId = b.companyId;
    companyCId = c.companyId;
    basicPlanId = basicPlan.id;

    const promo = await prisma.promoCode.create({
      data: { code: `TEST-${Date.now()}`, planId: basicPlanId, durationDays: 60, maxRedemptions: 2 },
    });
    promoId = promo.id;
  });

  afterAll(async () => {
    await prisma.promoCodeRedemption.deleteMany({ where: { promoCodeId: promoId } });
    await prisma.promoCode.delete({ where: { id: promoId } });
    await deleteTestCompany(companyAId);
    await deleteTestCompany(companyBId);
    await deleteTestCompany(companyCId);
  });

  it("rejects a code that doesn't exist", async () => {
    await expect(redeemPromoCode(companyAId, "NOPE-DOES-NOT-EXIST")).rejects.toThrow(PromoCodeInvalidError);
  });

  it("redeems successfully and activates the correct plan/duration, case-insensitively", async () => {
    const promo = await prisma.promoCode.findUniqueOrThrow({ where: { id: promoId } });
    const { subscription, planNameAr } = await redeemPromoCode(companyAId, promo.code.toLowerCase());

    expect(subscription.planId).toBe(basicPlanId);
    expect(subscription.status).toBe("ACTIVE");
    expect(subscription.trialEnd).toBeNull();
    const daysLeft = Math.round((subscription.currentPeriodEnd.getTime() - Date.now()) / 86400000);
    expect(daysLeft).toBeGreaterThanOrEqual(59);
    expect(daysLeft).toBeLessThanOrEqual(60);
    expect(planNameAr).toBeTruthy();

    const updatedPromo = await prisma.promoCode.findUniqueOrThrow({ where: { id: promoId } });
    expect(updatedPromo.redeemedCount).toBe(1);
  });

  it("rejects a second redemption attempt from the same company", async () => {
    const promo = await prisma.promoCode.findUniqueOrThrow({ where: { id: promoId } });
    await expect(redeemPromoCode(companyAId, promo.code)).rejects.toThrow(PromoCodeAlreadyUsedError);
  });

  it("allows a second, different company to redeem up to maxRedemptions", async () => {
    const promo = await prisma.promoCode.findUniqueOrThrow({ where: { id: promoId } });
    await redeemPromoCode(companyBId, promo.code);

    const updatedPromo = await prisma.promoCode.findUniqueOrThrow({ where: { id: promoId } });
    expect(updatedPromo.redeemedCount).toBe(2);
  });

  it("rejects a third company once maxRedemptions is exhausted", async () => {
    const promo = await prisma.promoCode.findUniqueOrThrow({ where: { id: promoId } });
    await expect(redeemPromoCode(companyCId, promo.code)).rejects.toThrow(PromoCodeExhaustedError);
  });

  it("rejects a deactivated code", async () => {
    const inactive = await prisma.promoCode.create({
      data: { code: `TEST-INACTIVE-${Date.now()}`, planId: basicPlanId, durationDays: 30, maxRedemptions: 10, isActive: false },
    });
    await expect(redeemPromoCode(companyCId, inactive.code)).rejects.toThrow(PromoCodeInvalidError);
    await prisma.promoCode.delete({ where: { id: inactive.id } });
  });

  it("rejects an expired code", async () => {
    const expired = await prisma.promoCode.create({
      data: {
        code: `TEST-EXPIRED-${Date.now()}`,
        planId: basicPlanId,
        durationDays: 30,
        maxRedemptions: 10,
        expiresAt: new Date(Date.now() - 86400000),
      },
    });
    await expect(redeemPromoCode(companyCId, expired.code)).rejects.toThrow(PromoCodeInvalidError);
    await prisma.promoCode.delete({ where: { id: expired.id } });
  });
});
