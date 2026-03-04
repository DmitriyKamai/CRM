import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";

// Общая конфигурация NextAuth (используется в API-роуте и middleware)
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/auth/login"
  },
  providers: [
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
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID ?? "",
      clientSecret: process.env.APPLE_PRIVATE_KEY ?? ""
    })
  ],
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
      // Делаем роль и id доступными на клиенте
      if (session.user && token) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    }
  }
};

