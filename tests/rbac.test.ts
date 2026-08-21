import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { createTestCompany, deleteTestCompany } from "./helpers/testCompany";
import { DEFAULT_ROLES } from "@/lib/permissions/catalog";

describe("RBAC — Permission-Based Access Control (docs/ARCHITECTURE.md §7)", () => {
  let companyId: number;
  let ownerUserId: number;
  let cashierRoleId: number;
  let cashierUserId: number;
  let viewerRoleId: number;

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.companyId;
    ownerUserId = company.userId;

    const cashierRole = await prisma.role.findFirstOrThrow({ where: { companyId, name: "Cashier" } });
    cashierRoleId = cashierRole.id;
    const viewerRole = await prisma.role.findFirstOrThrow({ where: { companyId, name: "Viewer" } });
    viewerRoleId = viewerRole.id;

    const cashierUser = await prisma.user.create({
      data: {
        companyId,
        name: "Test Cashier",
        email: `cashier_${Date.now()}@example.test`,
        passwordHash: "unused",
        roleId: cashierRoleId,
        isOwner: false,
      },
    });
    cashierUserId = cashierUser.id;
  });

  afterAll(async () => {
    await deleteTestCompany(companyId);
  });

  it("Owner always has every permission regardless of role table contents", async () => {
    const allowed = await hasPermission({ userId: ownerUserId, roleId: null, isOwner: true, code: "purchases.approve" });
    expect(allowed).toBe(true);
  });

  it("a Cashier role (non-owner) CANNOT approve purchases — not in its DEFAULT_ROLES grant list", async () => {
    expect(DEFAULT_ROLES.Cashier).not.toContain("purchases.approve");
    const allowed = await hasPermission({ userId: cashierUserId, roleId: cashierRoleId, isOwner: false, code: "purchases.approve" });
    expect(allowed).toBe(false);
  });

  it("a Cashier CAN create sales — explicitly granted in DEFAULT_ROLES", async () => {
    const allowed = await hasPermission({ userId: cashierUserId, roleId: cashierRoleId, isOwner: false, code: "sales.create" });
    expect(allowed).toBe(true);
  });

  it("a Viewer role cannot create anything — only view.* permissions granted", async () => {
    const allowed = await hasPermission({ userId: cashierUserId, roleId: viewerRoleId, isOwner: false, code: "items.create" });
    expect(allowed).toBe(false);
  });

  it("a user with no role at all (roleId null, not owner) has zero permissions", async () => {
    const allowed = await hasPermission({ userId: cashierUserId, roleId: null, isOwner: false, code: "items.view" });
    expect(allowed).toBe(false);
  });

  it("a per-user DENY override blocks a permission the role would otherwise grant", async () => {
    const perm = await prisma.permission.findFirstOrThrow({ where: { code: "sales.create" } });
    await prisma.userPermission.create({
      data: { userId: cashierUserId, permissionId: perm.id, effect: "DENY" },
    });
    const allowed = await hasPermission({ userId: cashierUserId, roleId: cashierRoleId, isOwner: false, code: "sales.create" });
    expect(allowed).toBe(false);
    await prisma.userPermission.deleteMany({ where: { userId: cashierUserId, permissionId: perm.id } });
  });

  it("a per-user GRANT override allows a permission the role would otherwise deny", async () => {
    const perm = await prisma.permission.findFirstOrThrow({ where: { code: "purchases.approve" } });
    await prisma.userPermission.create({
      data: { userId: cashierUserId, permissionId: perm.id, effect: "GRANT" },
    });
    const allowed = await hasPermission({ userId: cashierUserId, roleId: cashierRoleId, isOwner: false, code: "purchases.approve" });
    expect(allowed).toBe(true);
    await prisma.userPermission.deleteMany({ where: { userId: cashierUserId, permissionId: perm.id } });
  });
});
