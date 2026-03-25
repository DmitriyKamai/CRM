import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: string | null;
  }

  interface Session {
    user: {
      id?: string;
      role?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string | null;
    name?: string | null;
    email?: string | null;
    picture?: string | null;
  }
}
