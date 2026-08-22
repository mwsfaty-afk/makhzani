import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { createStockOrder } from "@/lib/services/inventory/createStockOrder";
import { postStockOrder } from "@/lib/services/inventory/postStockOrder";
import { deleteStockOrderDraft } from "@/lib/services/inventory/deleteStockOrderDraft";
import { createTestCompany, deleteTestCompany } from "./helpers/testCompany";

describe("Stock In/Out Orders (Phase 19) — Draft→approve workflow reusing StockAdjustment", () => {
  let companyId: number;
  let userId: number;
  let warehouseId: number;
  let itemId: number;
  let warehouseManagerRoleId: number;
  let storekeeperRoleId: number;

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.companyId;
    userId = company.userId;
    warehouseId = company.warehouseId;

    const unit = await prisma.unit.create({ data: { companyId, name: "Piece", nameAr: "قطعة" } });
    const item = await prisma.item.create({
      data: {
        companyId,
        code: "SO-TEST-ITEM",
        name: "Stock Order Test Item",
        nameAr: "صنف اختبار أوامر التوريد",
        baseUnitId: unit.id,
        purchasePrice: 10,
        salePrice: 20,
      } as never,
    });
    itemId = item.id;

    warehouseManagerRoleId = (await prisma.role.findFirstOrThrow({ where: { companyId, name: "Warehouse Manager" } })).id;
    storekeeperRoleId = (await prisma.role.findFirstOrThrow({ where: { companyId, name: "Storekeeper" } })).id;
  });

  afterAll(async () => {
    await deleteTestCompany(companyId);
  });

  it("creating a stock-in order leaves the stock balance untouched (DRAFT has zero effect)", async () => {
    const order = await createStockOrder({
      companyId,
      userId,
      warehouseId,
      direction: "IN",
      reason: "adjustment",
      date: new Date(),
      lines: [{ itemId, qty: 50, unitCost: 12 }],
    });
    expect(order.status).toBe("DRAFT");

    const balance = await prisma.stockBalance.findUnique({
      where: { companyId_itemId_warehouseId: { companyId, itemId, warehouseId } },
    });
    expect(balance).toBeNull();
  });

  it("posting a stock-in order actually increases the stock balance", async () => {
    const order = await createStockOrder({
      companyId,
      userId,
      warehouseId,
      direction: "IN",
      reason: "adjustment",
      date: new Date(),
      lines: [{ itemId, qty: 100, unitCost: 10 }],
    });

    await postStockOrder(companyId, order.id, userId);

    const posted = await prisma.stockAdjustment.findUniqueOrThrow({ where: { id: order.id } });
    expect(posted.status).toBe("POSTED");

    const balance = await prisma.stockBalance.findUniqueOrThrow({
      where: { companyId_itemId_warehouseId: { companyId, itemId, warehouseId } },
    });
    expect(Number(balance.qty)).toBe(100);
    expect(Number(balance.avgCost)).toBe(10);
  });

  it("posting a stock-out order actually decreases the stock balance", async () => {
    const order = await createStockOrder({
      companyId,
      userId,
      warehouseId,
      direction: "OUT",
      reason: "consumption",
      date: new Date(),
      lines: [{ itemId, qty: 30 }],
    });

    await postStockOrder(companyId, order.id, userId);

    const balance = await prisma.stockBalance.findUniqueOrThrow({
      where: { companyId_itemId_warehouseId: { companyId, itemId, warehouseId } },
    });
    expect(Number(balance.qty)).toBe(70);
  });

  it("cannot post the same order twice", async () => {
    const order = await createStockOrder({
      companyId,
      userId,
      warehouseId,
      direction: "IN",
      reason: "adjustment",
      date: new Date(),
      lines: [{ itemId, qty: 5, unitCost: 10 }],
    });
    await postStockOrder(companyId, order.id, userId);
    await expect(postStockOrder(companyId, order.id, userId)).rejects.toThrow();
  });

  it("a stock-in order's optional expiryDate flows through into the resulting StockMovement", async () => {
    const expiryDate = new Date("2027-01-01");
    const order = await createStockOrder({
      companyId,
      userId,
      warehouseId,
      direction: "IN",
      reason: "adjustment",
      date: new Date(),
      lines: [{ itemId, qty: 10, unitCost: 10, expiryDate }],
    });
    await postStockOrder(companyId, order.id, userId);

    const movement = await prisma.stockMovement.findFirstOrThrow({
      where: { companyId, documentType: "stock_in", documentId: order.id },
    });
    expect(movement.expiryDate?.toISOString().slice(0, 10)).toBe("2027-01-01");
  });

  it("deleting a DRAFT order removes it with zero stock effect; deleting a POSTED order is rejected", async () => {
    const draft = await createStockOrder({
      companyId,
      userId,
      warehouseId,
      direction: "IN",
      reason: "adjustment",
      date: new Date(),
      lines: [{ itemId, qty: 1, unitCost: 1 }],
    });
    await deleteStockOrderDraft(companyId, draft.id);
    const gone = await prisma.stockAdjustment.findUnique({ where: { id: draft.id } });
    expect(gone).toBeNull();

    const posted = await createStockOrder({
      companyId,
      userId,
      warehouseId,
      direction: "IN",
      reason: "adjustment",
      date: new Date(),
      lines: [{ itemId, qty: 1, unitCost: 1 }],
    });
    await postStockOrder(companyId, posted.id, userId);
    await expect(deleteStockOrderDraft(companyId, posted.id)).rejects.toThrow();
  });

  it("RBAC: Storekeeper can create stock orders but cannot approve them; Warehouse Manager can do both", async () => {
    const canStorekeeperCreate = await hasPermission({ userId, roleId: storekeeperRoleId, isOwner: false, code: "stock_orders.create" });
    const canStorekeeperApprove = await hasPermission({ userId, roleId: storekeeperRoleId, isOwner: false, code: "stock_orders.approve" });
    const canManagerApprove = await hasPermission({ userId, roleId: warehouseManagerRoleId, isOwner: false, code: "stock_orders.approve" });

    expect(canStorekeeperCreate).toBe(true);
    expect(canStorekeeperApprove).toBe(false);
    expect(canManagerApprove).toBe(true);
  });
});
