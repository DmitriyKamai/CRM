import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
// GoogleProvider and AppleProvider are loaded conditionally at runtime
// to avoid bundling openid-client/jose/oauth into the server compilation graph

import { prisma } from "@/lib/db";

function safeNoop<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

/** Адаптер-заглушка: не обращается к БД. Все методы не бросают, чтобы не ронять процесс. */
const noopAdapter: Adapter = {
  async createUser() {
    return safeNoop(() => null as any) ?? (null as any);
  },
  async getUser() {
    return safeNoop(() => null) ?? null;
  },
  async getUserByEmail() {
    return safeNoop(() => null) ?? null;
  },
  async getUserByAccount() {
    return safeNoop(() => null) ?? null;
  },
  async updateUser() {
    return safeNoop(() => null as any) ?? (null as any);
  },
  async linkAccount() {
    safeNoop(() => {});
  },
  async createSession() {
    return safeNoop(() => null as any) ?? (null as any);
  },
  async getSessionAndUser() {
    return safeNoop(() => null) ?? null;
  },
  async updateSession() {
    return safeNoop(() => null) ?? null;
  },
  async deleteSession() {
    safeNoop(() => {});
  },
  async createVerificationToken() {
    return safeNoop(() => null) ?? null;
  },
  async useVerificationToken() {
    return safeNoop(() => null) ?? null;
  }
};

function buildProviders() {
  const providers: NextAuthOptions["providers"] = [
    CredentialsProvider({
      name: "Email и пароль",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Укажите email и пароль");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.hashedPassword) {
          throw new Error("Неверный email или пароль");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isValid) {
          throw new Error("Неверный email или пароль");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role
        } as any;
      }
    })
  ];
  const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (googleId && googleSecret) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const GP = require("next-auth/providers/google").default;
    providers.push(GP({ clientId: googleId, clientSecret: googleSecret }));
  }
  const appleId = process.env.APPLE_ID?.trim();
  const appleSecret = process.env.APPLE_PRIVATE_KEY?.trim();
  if (appleId && appleSecret) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AP = require("next-auth/providers/apple").default;
    providers.push(AP({ clientId: appleId, clientSecret: appleSecret }));
  }
  return providers;
}

function hasOAuthProviders(): boolean {
  const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const appleId = process.env.APPLE_ID?.trim();
  const appleSecret = process.env.APPLE_PRIVATE_KEY?.trim();
  return !!(googleId && googleSecret) || !!(appleId && appleSecret);
}

// Общая конфигурация NextAuth (используется в API-роуте и middleware).
// При отсутствии OAuth используем noopAdapter, чтобы не обращаться к Account/Session и не падать.
export const authOptions: NextAuthOptions = {
  adapter: hasOAuthProviders() ? PrismaAdapter(prisma) : noopAdapter,
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/auth/login"
  },
  providers: buildProviders(),
  callbacks: {
    async jwt({ token, user }) {
      // При логине добавляем роль и id пользователя в токен
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user || !token) return session;
      (session.user as any).id = token.id;
      (session.user as any).role = token.role;
      // Всегда подставляем актуальные name, email, image из БД, чтобы навбар обновлялся после изменений в профиле
      const userId = (token.id ?? token.sub) as string | undefined;
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true, image: true }
        });
        if (user) {
          session.user.email = user.email;
          session.user.image = user.image ?? undefined;
          if ((token.role as string) === "PSYCHOLOGIST") {
            const profile = await prisma.psychologistProfile.findUnique({
              where: { userId },
              select: { firstName: true, lastName: true }
            });
            if (profile) {
              const fullName = [profile.firstName, profile.lastName]
                .filter(Boolean)
                .join(" ")
                .trim();
              if (fullName) session.user.name = fullName;
            } else if (user.name) {
              session.user.name = user.name;
            }
          } else {
            if (user.name) session.user.name = user.name;
          }
        }
      }
      return session;
    }
  }
};

