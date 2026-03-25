import { NextResponse } from "next/server";

import type { TestType } from "@prisma/client";

import { prisma } from "@/lib/db";

export interface DiagnosticLinkWithRelations {
  id: string;
  token: string;
  testId: string;
  psychologistId: string | null;
  clientId: string | null;
  expiresAt: Date | null;
  maxUses: number | null;
  usedCount: number;
  test: {
    id: string;
    type: TestType;
    title: string;
    isActive: boolean;
  };
  client: { id: string; userId: string | null } | null;
  psychologist: { id: string; firstName: string; lastName: string } | null;
}

export type LinkValidationResult =
  | { ok: true; link: DiagnosticLinkWithRelations }
  | { ok: false; response: NextResponse };

export async function validateDiagnosticLink(
  token: string,
  expectedType?: TestType
): Promise<LinkValidationResult> {
  const link = await prisma.diagnosticLink.findUnique({
    where: { token },
    include: {
      test: true,
      client: true,
      psychologist: true
    }
  });

  if (!link || !link.test || !link.test.isActive) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Ссылка на тест недействительна" },
        { status: 404 }
      )
    };
  }

  if (expectedType && link.test.type !== expectedType) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Ссылка предназначена для другого теста" },
        { status: 400 }
      )
    };
  }

  const now = new Date();
  if (link.expiresAt && link.expiresAt < now) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Срок действия ссылки истёк" },
        { status: 410 }
      )
    };
  }

  if (link.maxUses != null && link.usedCount >= link.maxUses) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Ссылка уже была использована" },
        { status: 409 }
      )
    };
  }

  return { ok: true, link: link as DiagnosticLinkWithRelations };
}
