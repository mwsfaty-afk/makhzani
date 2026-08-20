import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      companyId: number;
      roleId: number | null;
      roleName: string | null;
      isOwner: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    companyId: number;
    roleId: number | null;
    roleName: string | null;
    isOwner: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: number;
    companyId: number;
    roleId: number | null;
    roleName: string | null;
    isOwner: boolean;
  }
}
