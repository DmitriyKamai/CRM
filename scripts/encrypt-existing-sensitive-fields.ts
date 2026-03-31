/**
 * Одноразовая миграция: plaintext → server encryption envelope.
 * Требует DATA_ENCRYPTION_KEY в окружении и доступ к БД.
 *
 * Запуск: npx tsx scripts/encrypt-existing-sensitive-fields.ts
 */
import "dotenv/config";

import { prisma } from "../lib/db";
import { encryptClientNotesForDb } from "../lib/server-encryption/client-profile-storage";
import { encryptCustomFieldValueForDb } from "../lib/server-encryption/custom-field-storage";
import {
  jsonFieldNeedsEncryption,
  stringFieldNeedsEncryption
} from "../lib/server-encryption/migrate-detect";
import {
  encryptRecommendationBodyForDb,
  encryptRecommendationTitleForDb
} from "../lib/server-encryption/recommendation-storage";
import {
  encryptTestResultInterpretationForDb,
  encryptTestResultRawAnswersForDb,
  encryptTestResultScaleScoresForDb
} from "../lib/server-encryption/test-result-storage";
import { encryptAppointmentNotesForDb } from "../lib/server-encryption/appointment-storage";

async function main() {
  let n = 0;

  const clients = await prisma.clientProfile.findMany({
    select: { id: true, notes: true }
  });
  for (const c of clients) {
    if (c.notes != null && stringFieldNeedsEncryption(c.notes)) {
      await prisma.clientProfile.update({
        where: { id: c.id },
        data: { notes: encryptClientNotesForDb(c.notes) }
      });
      n++;
    }
  }
  console.log(`ClientProfile.notes: обновлено ${n} записей`);

  n = 0;
  const cfValues = await prisma.customFieldValue.findMany({
    select: { id: true, value: true }
  });
  for (const row of cfValues) {
    if (jsonFieldNeedsEncryption(row.value)) {
      await prisma.customFieldValue.update({
        where: { id: row.id },
        data: { value: encryptCustomFieldValueForDb(row.value) }
      });
      n++;
    }
  }
  console.log(`CustomFieldValue: обновлено ${n} записей`);

  n = 0;
  const results = await prisma.testResult.findMany({
    select: { id: true, interpretation: true, rawAnswers: true, scaleScores: true }
  });
  for (const r of results) {
    const upd: {
      interpretation?: string | null;
      rawAnswers?: object;
      scaleScores?: object;
    } = {};
    if (r.interpretation != null && stringFieldNeedsEncryption(r.interpretation)) {
      upd.interpretation = encryptTestResultInterpretationForDb(r.interpretation);
    }
    if (jsonFieldNeedsEncryption(r.rawAnswers)) {
      upd.rawAnswers = encryptTestResultRawAnswersForDb(r.rawAnswers) as object;
    }
    if (jsonFieldNeedsEncryption(r.scaleScores)) {
      upd.scaleScores = encryptTestResultScaleScoresForDb(r.scaleScores) as object;
    }
    if (Object.keys(upd).length > 0) {
      await prisma.testResult.update({ where: { id: r.id }, data: upd });
      n++;
    }
  }
  console.log(`TestResult: обновлено ${n} записей`);

  n = 0;
  const recs = await prisma.recommendation.findMany({
    select: { id: true, title: true, body: true }
  });
  for (const r of recs) {
    const upd: { title?: string; body?: string } = {};
    if (stringFieldNeedsEncryption(r.title)) {
      upd.title = encryptRecommendationTitleForDb(r.title);
    }
    if (stringFieldNeedsEncryption(r.body)) {
      upd.body = encryptRecommendationBodyForDb(r.body);
    }
    if (Object.keys(upd).length > 0) {
      await prisma.recommendation.update({ where: { id: r.id }, data: upd });
      n++;
    }
  }
  console.log(`Recommendation: обновлено ${n} записей`);

  n = 0;
  const appts = await prisma.appointment.findMany({
    select: { id: true, notes: true }
  });
  for (const a of appts) {
    if (a.notes != null && stringFieldNeedsEncryption(a.notes)) {
      await prisma.appointment.update({
        where: { id: a.id },
        data: { notes: encryptAppointmentNotesForDb(a.notes) }
      });
      n++;
    }
  }
  console.log(`Appointment.notes: обновлено ${n} записей`);

  console.log("Готово.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
