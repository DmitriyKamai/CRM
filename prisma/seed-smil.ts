/**
 * Сид теста СМИЛ (Стандартизированный многофакторный метод исследования личности, Л.Н. Собчик).
 * Вопросы загружаются из JSON через API /api/diagnostics/smil/questions, в БД записей TestQuestion не создаём.
 */

import { PrismaClient, TestType } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_TITLE = "СМИЛ — Стандартизированный многофакторный метод исследования личности (Л.Н. Собчик)";
const TEST_DESCRIPTION = `Методика СМИЛ (MMPI в адаптации Л.Н. Собчик) предназначена для многомерной оценки личности. 566 утверждений, ответы «верно»/«неверно». Оцениваются базовые шкалы (L, F, K, 1–0), контрольные и клинические. Результаты переводятся в T-баллы по половым нормам, формируется текстовая интерпретация.

Вопросы и нормы: по материалам Psylab.info.`;

async function main() {
  const test = await prisma.test.upsert({
    where: { type: TestType.SMIL },
    update: {
      title: TEST_TITLE,
      description: TEST_DESCRIPTION,
      isActive: true
    },
    create: {
      type: TestType.SMIL,
      title: TEST_TITLE,
      description: TEST_DESCRIPTION,
      isActive: true
    }
  });

  console.log("Тест СМИЛ записан в БД, testId =", test.id);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
