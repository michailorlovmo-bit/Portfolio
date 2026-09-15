import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "MANAGER" | "STAFF";
      canViewStats: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "MANAGER" | "STAFF";
    canViewStats: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "MANAGER" | "STAFF";
    canViewStats: boolean;
  }
}
