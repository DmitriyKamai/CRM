"use client";

import { signOut } from "next-auth/react";

import { SESSION_INVALID_CODE } from "@/lib/api-error-codes";

export function isSessionInvalidPayload(body: unknown): boolean {
  if (body == null || typeof body !== "object" || Array.isArray(body)) return false;
  return (body as Record<string, unknown>).code === SESSION_INVALID_CODE;
}

/** 401 + `code: SESSION_INVALID` — выход на страницу входа (после сброса БД и т.п.). */
export async function signOutIfSessionInvalid(
  status: number,
  body: unknown
): Promise<boolean> {
  if (status !== 401 || !isSessionInvalidPayload(body)) return false;
  await signOut({ callbackUrl: "/auth/login?reason=stale_session" });
  return true;
}
