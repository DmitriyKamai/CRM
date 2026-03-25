import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";

import { SESSION_INVALID_CODE } from "@/lib/api-error-codes";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** 401: сессия есть, данных в БД нет (сброс БД, удалён пользователь/профиль). Клиент делает signOut. */
export function sessionInvalidResponse(
  message = "Данные входа устарели или аккаунт удалён. Войдите снова."
) {
  return NextResponse.json(
    { message, code: SESSION_INVALID_CODE },
    { status: 401 }
  );
}

/** Роли из Prisma `Role` — для проверок в API. */
export type AppRole = "ADMIN" | "PSYCHOLOGIST" | "CLIENT" | "UNSPECIFIED";

export type SessionUser = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  role?: AppRole | string | null;
};

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first ?? request.headers.get("x-real-ip") ?? "unknown";
}

export function sessionUser(session: Session | null): SessionUser | null {
  if (!session?.user) return null;
  return session.user as SessionUser;
}

/**
 * Текущая сессия (без проверки userId — удобно для необязательной авторизации).
 */
export async function getAppSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

type AuthFailure = { ok: false; response: NextResponse };

/**
 * Требует валидную сессию и `user.id` в JWT/callback (как в остальных API).
 */
export async function requireAuth(): Promise<
  | { ok: true; session: Session; userId: string; user: SessionUser }
  | AuthFailure
> {
  const session = await getServerSession(authOptions);
  const user = sessionUser(session);
  const userId = user?.id?.trim();
  if (!session?.user || !userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Требуется авторизация" },
        { status: 401 }
      )
    };
  }
  return { ok: true, session, userId, user: user! };
}

/**
 * Требует одну из перечисленных ролей (после успешной `requireAuth`).
 */
export async function requireRoles(
  allowed: AppRole[]
): Promise<
  | { ok: true; session: Session; userId: string; user: SessionUser; role: AppRole }
  | AuthFailure
> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;
  const role = auth.user.role as AppRole | undefined;
  if (!role || !allowed.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Доступ запрещён" }, { status: 403 })
    };
  }
  return { ok: true, session: auth.session, userId: auth.userId, user: auth.user, role };
}

/**
 * Психолог: роль + запись `psychologistProfile` (типичный контекст для `/api/psychologist/*`).
 */
export async function requirePsychologist(): Promise<
  | {
      ok: true;
      session: Session;
      userId: string;
      user: SessionUser;
      psychologistId: string;
    }
  | AuthFailure
> {
  const auth = await requireRoles(["PSYCHOLOGIST"]);
  if (!auth.ok) return auth;

  const psych = await prisma.psychologistProfile.findUnique({
    where: { userId: auth.userId },
    select: { id: true }
  });

  if (!psych) {
    return {
      ok: false,
      response: sessionInvalidResponse(
        "Сессия недействительна: профиль специалиста не найден. Войдите снова."
      )
    };
  }

  return {
    ok: true,
    session: auth.session,
    userId: auth.userId,
    user: auth.user,
    psychologistId: psych.id
  };
}

/** Администратор (INITIAL_ADMIN в сессии уже учтён в callback auth). */
export async function requireAdmin(): Promise<
  | { ok: true; session: Session; userId: string; user: SessionUser; role: AppRole }
  | AuthFailure
> {
  return requireRoles(["ADMIN"]);
}

export async function requireClient(): Promise<
  | { ok: true; session: Session; userId: string; user: SessionUser; role: AppRole }
  | AuthFailure
> {
  return requireRoles(["CLIENT"]);
}

/**
 * Действия от лица «клиента в каталоге»: запись на слот, подтверждение/отмена своей записи к коллеге.
 * Специалист с ролью PSYCHOLOGIST тоже может (не к себе — отдельная проверка в POST /api/appointments).
 */
export async function requireClientOrPsychologist(): Promise<
  | { ok: true; session: Session; userId: string; user: SessionUser; role: AppRole }
  | AuthFailure
> {
  return requireRoles(["CLIENT", "PSYCHOLOGIST"]);
}
