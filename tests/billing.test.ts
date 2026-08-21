import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { tenantPrisma } from "@/lib/db/tenant";
import { createTestCompany, deleteTestCompany } from "./helpers/testCompany";
import { getSubscriptionWithPlan, assertSubscriptionActive, SubscriptionExpiredError } from "@/lib/services/billing/subscriptionGuard";
import { enforceCountLimit, PlanLimitExceededError } from "@/lib/services/billing/enforceLimit";
import { startCheckout } from "@/lib/services/billing/startCheckout";
import {
  activateSubscriptionFromPayment,
  rejectManualPayment,
  PaymentAlreadyProcessedError,
} from "@/lib/services/billing/activateSubscription";
import { attachManualPaymentProof } from "@/lib/services/billing/submitManualProof";

describe("Subscriptions, plan limits, and payment states", () => {
  let companyId: number;

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.companyId;
  });

  afterAll(async () => {
    await deleteTestCompany(companyId);
  });

  it("a freshly registered company gets a TRIALING subscription on the trial plan", async () => {
    const sub = await getSubscriptionWithPlan(companyId);
    expect(sub.status).toBe("TRIALING");
    expect(sub.plan.code).toBe("trial");
  });

  it("assertSubscriptionActive() passes while TRIALING and not yet expired", async () => {
    await expect(assertSubscriptionActive(companyId)).resolves.toBeDefined();
  });

  it("expiring the subscription (currentPeriodEnd in the past) is caught lazily on the very next read, without a cron job", async () => {
    await prisma.subscription.update({ where: { companyId }, data: { currentPeriodEnd: new Date(Date.now() - 86400000) } });
    const sub = await getSubscriptionWithPlan(companyId);
    expect(sub.status).toBe("EXPIRED");
  });

  it("assertSubscriptionActive() rejects once EXPIRED", async () => {
    await expect(assertSubscriptionActive(companyId)).rejects.toThrow(SubscriptionExpiredError);
  });

  it("the tenantPrisma() extension blocks a write (not just service-level calls) while EXPIRED", async () => {
    const db = tenantPrisma(companyId);
    await expect(db.customer.create({ data: { code: `C-${Date.now()}`, name: "x" } as never })).rejects.toThrow(SubscriptionExpiredError);
  });

  it("reactivating the subscription (ACTIVE + future period) lets writes through again", async () => {
    await prisma.subscription.update({
      where: { companyId },
      data: { status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
    });
    await expect(assertSubscriptionActive(companyId)).resolves.toBeDefined();
  });

  it("plan count limits (maxWarehouses etc.) are enforced against the CURRENT plan value, live", async () => {
    const plan = await prisma.subscription.findUniqueOrThrow({ where: { companyId }, include: { plan: true } });
    const currentWarehouseCount = await prisma.warehouse.count({ where: { companyId } });

    // lower the limit to exactly the current count -> next create must be blocked
    await prisma.plan.update({ where: { id: plan.planId }, data: { maxWarehouses: currentWarehouseCount } });
    await expect(enforceCountLimit("warehouse", companyId)).rejects.toThrow(PlanLimitExceededError);

    // raise it comfortably above the current count -> no longer blocked (note: the
    // trial plan's *original* value can legitimately equal currentWarehouseCount too,
    // e.g. a fresh test company starts with exactly 1 warehouse == Trial's maxWarehouses,
    // so restoring to the literal original value would still be at the boundary — this
    // must raise it clear of that boundary to actually prove the limit lifted)
    await prisma.plan.update({ where: { id: plan.planId }, data: { maxWarehouses: currentWarehouseCount + 10 } });
    await expect(enforceCountLimit("warehouse", companyId)).resolves.toBeUndefined();
    await prisma.plan.update({ where: { id: plan.planId }, data: { maxWarehouses: plan.plan.maxWarehouses } });
  });

  it("mock gateway checkout (dev-only) instantly activates the subscription on the purchased plan", async () => {
    const basicPlan = await prisma.plan.findUniqueOrThrow({ where: { code: "basic" } });
    const outcome = await startCheckout({
      companyId,
      planId: basicPlan.id,
      gatewayCode: "mock",
      returnUrl: "http://localhost/dashboard/billing",
      cancelUrl: "http://localhost/dashboard/billing",
    });
    expect(outcome.result.kind).toBe("redirect");

    const sub = await prisma.subscription.findUniqueOrThrow({ where: { companyId } });
    expect(sub.status).toBe("ACTIVE");
    expect(sub.planId).toBe(basicPlan.id);
  });

  it("the mock gateway is refused outright in a simulated production environment", async () => {
    const original = process.env.NODE_ENV;
    // @ts-expect-error -- NODE_ENV is readonly in the type defs but writable at runtime for this test
    process.env.NODE_ENV = "production";
    try {
      const basicPlan = await prisma.plan.findUniqueOrThrow({ where: { code: "basic" } });
      await expect(
        startCheckout({
          companyId,
          planId: basicPlan.id,
          gatewayCode: "mock",
          returnUrl: "http://localhost/dashboard/billing",
          cancelUrl: "http://localhost/dashboard/billing",
        }),
      ).rejects.toThrow();
    } finally {
      // @ts-expect-error -- see above
      process.env.NODE_ENV = original;
    }
  });

  it("manual payment (Vodafone Cash) full lifecycle: PENDING -> proof attached -> admin approves -> subscription activated on the paid plan", async () => {
    const proPlan = await prisma.plan.findUniqueOrThrow({ where: { code: "professional" } });
    const outcome = await startCheckout({
      companyId,
      planId: proPlan.id,
      gatewayCode: "vodafone_cash",
      returnUrl: "http://localhost/dashboard/billing",
      cancelUrl: "http://localhost/dashboard/billing",
    });
    expect(outcome.result.kind).toBe("manual");

    let payment = await prisma.payment.findUniqueOrThrow({ where: { id: outcome.paymentId } });
    expect(payment.status).toBe("PENDING");

    await attachManualPaymentProof({
      paymentId: outcome.paymentId,
      companyId,
      referenceNumber: "TXN-VITEST-1",
      fileBuffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0]), // valid JPEG magic bytes
      fileMimeType: "image/jpeg",
      fileName: "receipt.jpg",
    });

    payment = await prisma.payment.findUniqueOrThrow({ where: { id: outcome.paymentId } });
    expect(payment.status).toBe("PENDING"); // proof attached does not itself activate anything
    expect(payment.referenceNumber).toBe("TXN-VITEST-1");

    const admin = await prisma.platformAdmin.findFirstOrThrow();
    await activateSubscriptionFromPayment(outcome.paymentId, { reviewedByAdminId: admin.id });

    payment = await prisma.payment.findUniqueOrThrow({ where: { id: outcome.paymentId } });
    expect(payment.status).toBe("PAID");

    const sub = await prisma.subscription.findUniqueOrThrow({ where: { companyId } });
    expect(sub.planId).toBe(proPlan.id);
    expect(sub.status).toBe("ACTIVE");
  });

  it("approving the SAME payment twice is rejected atomically (no double-activation)", async () => {
    const proPlan = await prisma.plan.findUniqueOrThrow({ where: { code: "professional" } });
    const paidPayment = await prisma.payment.findFirstOrThrow({
      where: { companyId, planId: proPlan.id, status: "PAID" },
      orderBy: { id: "desc" },
    });
    await expect(activateSubscriptionFromPayment(paidPayment.id)).rejects.toThrow(PaymentAlreadyProcessedError);
  });

  it("rejecting a manual payment marks it FAILED with a reason and does NOT touch the subscription", async () => {
    const basicPlan = await prisma.plan.findUniqueOrThrow({ where: { code: "basic" } });
    const outcome = await startCheckout({
      companyId,
      planId: basicPlan.id,
      gatewayCode: "al_rajhi_bank",
      returnUrl: "http://localhost/dashboard/billing",
      cancelUrl: "http://localhost/dashboard/billing",
    });

    const subBefore = await prisma.subscription.findUniqueOrThrow({ where: { companyId } });

    const admin = await prisma.platformAdmin.findFirstOrThrow();
    const rejected = await rejectManualPayment(outcome.paymentId, admin.id, "لا يوجد تحويل مطابق");
    expect(rejected.status).toBe("FAILED");
    expect(rejected.rejectionReason).toBe("لا يوجد تحويل مطابق");

    const subAfter = await prisma.subscription.findUniqueOrThrow({ where: { companyId } });
    expect(subAfter.planId).toBe(subBefore.planId);
    expect(subAfter.status).toBe(subBefore.status);
  });

  it("rejecting an already-processed payment is refused atomically, same as double-approval", async () => {
    const failedPayment = await prisma.payment.findFirstOrThrow({ where: { companyId, status: "FAILED" }, orderBy: { id: "desc" } });
    const admin = await prisma.platformAdmin.findFirstOrThrow();
    await expect(rejectManualPayment(failedPayment.id, admin.id, "محاولة رفض مكررة")).rejects.toThrow(PaymentAlreadyProcessedError);
  });

  it("PayPal checkout without configured credentials fails cleanly and leaves the payment FAILED, not dangling PENDING", async () => {
    const basicPlan = await prisma.plan.findUniqueOrThrow({ where: { code: "basic" } });
    await expect(
      startCheckout({
        companyId,
        planId: basicPlan.id,
        gatewayCode: "paypal",
        returnUrl: "http://localhost/api/billing/paypal/return",
        cancelUrl: "http://localhost/api/billing/paypal/cancel",
      }),
    ).rejects.toThrow();

    const lastPaypalPayment = await prisma.payment.findFirstOrThrow({
      where: { companyId, gateway: "paypal" },
      orderBy: { id: "desc" },
    });
    expect(lastPaypalPayment.status).toBe("FAILED");
  });
});
