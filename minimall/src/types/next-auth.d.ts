import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      membershipLevel: number;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    membershipLevel: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    membershipLevel: number;
  }
}
