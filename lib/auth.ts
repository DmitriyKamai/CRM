import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import type { Adapter, AdapterSession, AdapterUser } from "next-auth/adapters";
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

const noopAdapterUser = null as unknown as AdapterUser;
const noopAdapterSession = null as unknown as AdapterSession;

/** Адаптер-заглушка: не обращается к БД. Все методы не бросают, чтобы не ронять процесс. */
/** Однократное чтение OAuth-переменных окружения (buildProviders + adapter). */
const oauthEnvConfig = (() => {
  const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const appleId = process.env.APPLE_ID?.trim();
  const applePrivateKey = process.env.APPLE_PRIVATE_KEY?.trim();
  const appleTeamId = process.env.APPLE_TEAM_ID?.trim();
  const appleKeyId = process.env.APPLE_KEY_ID?.trim();
  const google =
    googleId && googleSecret
      ? { clientId: googleId, clientSecret: googleSecret }
      : null;
  const appleConfigured = !!(
    appleId &&
    applePrivateKey &&
    appleTeamId &&
    appleKeyId
  );
  return {
    google,
    apple:
      appleConfigured && appleId && applePrivateKey && appleTeamId && appleKeyId
        ? {
            appleId,
            applePrivateKey,
            appleTeamId,
            appleKeyId
          }
        : null,
    hasOAuth: !!google || appleConfigured
  };
})();

const noopAdapter: Adapter = {
  async createUser() {
    return safeNoop(() => noopAdapterUser) ?? noopAdapterUser;
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
    return safeNoop(() => noopAdapterUser) ?? noopAdapterUser;
  },
  async linkAccount() {
    safeNoop(() => {});
  },
  async createSession() {
    return safeNoop(() => noopAdapterSession) ?? noopAdapterSession;
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
        };
      }
    })
  ];
  if (oauthEnvConfig.google) {
    const { clientId, clientSecret } = oauthEnvConfig.google;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const GP = require("next-auth/providers/google").default;
    providers.push(GP({ clientId, clientSecret }));
  }
  if (oauthEnvConfig.apple) {
    const { appleId, applePrivateKey, appleTeamId, appleKeyId } =
      oauthEnvConfig.apple;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AP = require("next-auth/providers/apple").default;
    providers.push(
      AP({
        clientId: appleId,
        clientSecret: {
          teamId: appleTeamId,
          privateKey: applePrivateKey,
          keyId: appleKeyId
        }
      })
    );
  }
  return providers;
}

function hasOAuthProviders(): boolean {
  return oauthEnvConfig.hasOAuth;
}

export const OAUTH_LINK_COOKIE = "oauth_link_uid";

function parseCookieUserId(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${OAUTH_LINK_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

function buildCallbacks(req: Request | null): NextAuthOptions["callbacks"] {
  return {
    async signIn({ account }) {
      if (!req || !account || (account.provider !== "google" && account.provider !== "apple")) return true;
      const linkUserId = parseCookieUserId(req.headers.get("cookie") ?? null);
      if (!linkUserId) return true;
      const existing = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId
          }
        },
        select: { userId: true }
      });
      if (existing && existing.userId !== linkUserId) {
        return "/auth/login?error=AccountAlreadyLinked";
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      // При первом входе — сохраняем id и роль в JWT.
      if (user) {
        token.id = user.id;
        token.role = user.role ?? null;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image ?? null;
      }
      // При явном обновлении токена (signIn, update) — обновляем данные из БД.
      if (trigger === "update" || (!token.role && token.id)) {
        const userId = (token.id ?? token.sub) as string | undefined;
        if (userId) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: userId },
              select: { name: true, email: true, image: true, role: true }
            });
            if (dbUser) {
              const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
              const isInitialAdmin = !!(initialAdminEmail && dbUser.email.toLowerCase() === initialAdminEmail);
              if (isInitialAdmin && dbUser.role !== "ADMIN") {
                await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
                token.role = "ADMIN";
              } else if (isInitialAdmin) {
                token.role = "ADMIN";
              } else {
                token.role = dbUser.role;
              }
              token.email = dbUser.email;
              token.picture = dbUser.image ?? null;
              if (dbUser.role === "PSYCHOLOGIST") {
                const profile = await prisma.psychologistProfile.findUnique({
                  where: { userId },
                  select: { firstName: true, lastName: true }
                });
                if (profile) {
                  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
                  if (fullName) token.name = fullName;
                } else {
                  token.name = dbUser.name ?? null;
                }
              } else {
                token.name = dbUser.name ?? null;
              }
            }
          } catch (e) {
            console.error("[auth] jwt callback:", e);
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user || !token) return session;
      if (token.id) session.user.id = token.id;
      if (token.role) session.user.role = token.role;
      if (token.name) session.user.name = token.name;
      if (token.email) session.user.email = token.email;
      if (token.picture) session.user.image = token.picture;
      return session;
    }
  };
}

// Общая конфигурация NextAuth (используется в API-роуте; глобальные заголовки — в proxy.ts).
// При отсутствии OAuth используем noopAdapter, чтобы не обращаться к Account/Session и не падать.
export const authOptions: NextAuthOptions = {
  adapter: hasOAuthProviders() ? PrismaAdapter(prisma) : noopAdapter,
  // JWT-сессия: ограничиваем срок и частоту продления токена (меньше окно компрометации украденной сессии).
  session: {
    strategy: "jwt",
    maxAge: 14 * 24 * 60 * 60, // 14 суток
    updateAge: 24 * 60 * 60 // не чаще раза в сутки при активности
  },
  pages: { signIn: "/auth/login" },
  providers: buildProviders(),
  callbacks: buildCallbacks(null)
};

/** Вариант с проверкой «привязки»: один Google/Apple не может быть привязан к разным пользователям. */
export function getAuthOptions(req: Request): NextAuthOptions {
  return {
    ...authOptions,
    callbacks: buildCallbacks(req)
  };
}

