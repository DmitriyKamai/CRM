import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ClientHistoryType, safeLogClientHistory } from "@/lib/client-history";
import {
  encryptTestResultInterpretationForDb,
  encryptTestResultRawAnswersForDb,
  encryptTestResultScaleScoresForDb
} from "@/lib/server-encryption/test-result-storage";

import type { DiagnosticLinkWithRelations } from "./link-validation";

interface SubmitResultParams {
  link: DiagnosticLinkWithRelations;
  rawAnswers: Prisma.InputJsonValue;
  scaleScores: Prisma.InputJsonValue;
  interpretation: string;
}

export async function saveTestResultAndIncrement({
  link,
  rawAnswers,
  scaleScores,
  interpretation
}: SubmitResultParams) {
  const testResult = await prisma.$transaction(async (tx) => {
    const tr = await tx.testResult.create({
      data: {
        testId: link.testId,
        clientId: link.clientId ?? null,
        psychologistId: link.psychologistId ?? null,
        rawAnswers: encryptTestResultRawAnswersForDb(rawAnswers as Prisma.JsonValue),
        scaleScores: encryptTestResultScaleScoresForDb(scaleScores as Prisma.JsonValue),
        interpretation: encryptTestResultInterpretationForDb(interpretation)
      }
    });
    await tx.diagnosticLink.update({
      where: { id: link.id },
      data: { usedCount: { increment: 1 } }
    });
    await tx.diagnosticProgress.deleteMany({
      where: { diagnosticLinkId: link.id }
    });
    return tr;
  });

  if (link.clientId) {
    await safeLogClientHistory({
      clientId: link.clientId,
      type: ClientHistoryType.DIAGNOSTIC_COMPLETED,
      actorUserId: null,
      meta: {
        testType: link.test.type,
        testTitle: link.test.title,
        resultId: testResult.id
      }
    });
  }

  return testResult;
}
