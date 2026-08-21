import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { tenantPrisma } from "@/lib/db/tenant";
import { createTestCompany, deleteTestCompany } from "./helpers/testCompany";

describe("Multi-tenant isolation — Company A must never read/modify/delete Company B data", () => {
  let companyA: number;
  let companyB: number;
  let itemA: number;
  let customerA: number;

  beforeAll(async () => {
    const a = await createTestCompany();
    const b = await createTestCompany();
    companyA = a.companyId;
    companyB = b.companyId;

    const unit = await prisma.unit.findFirstOrThrow({ where: { companyId: companyA } }).catch(async () => {
      return prisma.unit.create({ data: { companyId: companyA, name: "Piece", nameAr: "قطعة" } });
    });

    const item = await prisma.item.create({
      data: {
        companyId: companyA,
        code: "TEST-ITEM-A",
        name: "Company A Secret Item",
        nameAr: "صنف سري لشركة أ",
        baseUnitId: unit.id,
        purchasePrice: 10,
        salePrice: 20,
      } as never,
    });
    itemA = item.id;

    const customer = await prisma.customer.create({
      data: { companyId: companyA, code: "CUST-A", name: "Company A Customer" } as never,
    });
    customerA = customer.id;
  });

  afterAll(async () => {
    await deleteTestCompany(companyA);
    await deleteTestCompany(companyB);
  });

  it("Company B's tenantPrisma() cannot read Company A's item by id (IDOR)", async () => {
    const dbB = tenantPrisma(companyB);
    const result = await dbB.item.findUnique({ where: { id: itemA } });
    expect(result).toBeNull();
  });

  it("Company B's tenantPrisma() cannot list Company A's items at all", async () => {
    const dbB = tenantPrisma(companyB);
    const results = await dbB.item.findMany({});
    expect(results.find((i) => i.id === itemA)).toBeUndefined();
  });

  it("Company B's tenantPrisma() cannot update Company A's item (silently affects 0 rows, not A's row)", async () => {
    const dbB = tenantPrisma(companyB);
    await expect(
      dbB.item.update({ where: { id: itemA }, data: { name: "HACKED" } }),
    ).rejects.toThrow(); // Prisma throws P2025 (record not found) since the companyId filter excludes it

    const stillIntact = await prisma.item.findUniqueOrThrow({ where: { id: itemA } });
    expect(stillIntact.name).toBe("Company A Secret Item");
  });

  it("Company B's tenantPrisma() cannot delete Company A's customer", async () => {
    const dbB = tenantPrisma(companyB);
    await expect(dbB.customer.delete({ where: { id: customerA } })).rejects.toThrow();

    const stillExists = await prisma.customer.findUnique({ where: { id: customerA } });
    expect(stillExists).not.toBeNull();
  });

  it("a raw findFirst scoped by companyId (the pattern used in every [id] detail page) returns null for a cross-tenant id", async () => {
    const crossTenantLookup = await prisma.customer.findFirst({ where: { id: customerA, companyId: companyB } });
    expect(crossTenantLookup).toBeNull();
  });

  it("Company A's own tenantPrisma() CAN read its own item normally (sanity check — isolation isn't over-blocking)", async () => {
    const dbA = tenantPrisma(companyA);
    const result = await dbA.item.findUnique({ where: { id: itemA } });
    expect(result?.id).toBe(itemA);
  });
});
