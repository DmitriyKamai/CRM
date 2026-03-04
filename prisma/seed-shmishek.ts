/**
 * Скрипт наполнения БД структурой опросника Шмишека.
 *
 * ВНИМАНИЕ: тексты вопросов здесь демонстрационные и не претендуют
 * на дословное соответствие методике. Для реального использования
 * важно подставить утверждённые формулировки и схему оценивания.
 */

import { PrismaClient, TestType } from "@prisma/client";

const prisma = new PrismaClient();

const QUESTIONS: { index: number; text: string }[] = [
  {
    index: 1,
    text: "Мне легко заводить новые знакомства и поддерживать общение."
  },
  {
    index: 2,
    text: "Часто чувствую снижение настроения без видимой причины."
  },
  {
    index: 3,
    text: "Бывает, что моё настроение заметно меняется без особых причин."
  },
  {
    index: 4,
    text: "Я сильно переживаю радостные и печальные события."
  },
  {
    index: 5,
    text: "Мне свойственно заранее тревожиться о возможных трудностях."
  },
  {
    index: 6,
    text: "Я легко растрогиваюсь и глубоко переживаю за близких."
  },
  {
    index: 7,
    text: "Мне важно производить хорошее впечатление и нравиться людям."
  },
  {
    index: 8,
    text: "Мне бывает трудно отпустить обиду или несправедливость."
  },
  {
    index: 9,
    text: "В моменты напряжения мне сложно сдерживать раздражение."
  },
  {
    index: 10,
    text: "Я люблю порядок и точность в делах и деталях."
  }
];

const SCALES: { key: string; title: string; description: string }[] = [
  {
    key: "hyperthymic",
    title: "Гипертимный тип",
    description:
      "Склонность к повышенному настроению, активности и потребности в общении."
  },
  {
    key: "dysthymic",
    title: "Дистимный тип",
    description:
      "Склонность к снижению настроения, пессимистическим оценкам и утомляемости."
  },
  {
    key: "cyclothymic",
    title: "Циклотимный тип",
    description:
      "Выраженность колебаний настроения и энергетического тонуса."
  },
  {
    key: "exalted",
    title: "Экзальтированный тип",
    description:
      "Сильные эмоциональные реакции, впечатлительность и вдохновляемость."
  },
  {
    key: "anxious",
    title: "Тревожный тип",
    description: "Склонность к беспокойству и ожиданию неблагоприятных исходов."
  },
  {
    key: "emotive",
    title: "Эмотивный тип",
    description:
      "Глубина эмоциональных переживаний, ранимость и способность к эмпатии."
  },
  {
    key: "demonstrative",
    title: "Демонстративный тип",
    description:
      "Потребность в признании, стремление производить яркое впечатление."
  },
  {
    key: "stuck",
    title: "Застревающий тип",
    description:
      "Склонность надолго задерживаться на значимых переживаниях и обидах."
  },
  {
    key: "excitable",
    title: "Возбудимый тип",
    description:
      "Импульсивные реакции и повышенная раздражительность при перегрузке."
  },
  {
    key: "pedantic",
    title: "Педантичный тип",
    description:
      "Стремление к порядку, точности и контролю, внимательность к деталям."
  }
];

async function main() {
  const test = await prisma.test.upsert({
    where: {
      type: TestType.SHMISHEK
    },
    update: {
      title: "Опросник Шмишека (демо)",
      isActive: true
    },
    create: {
      type: TestType.SHMISHEK,
      title: "Опросник Шмишека (демо)",
      description:
        "Демонстрационная версия опросника Шмишека. Для реальной практики замените вопросы и шкалы на утверждённый вариант методики.",
      isActive: true
    }
  });

  // Пересоздаём вопросы в соответствии с текущим списком
  await prisma.testQuestion.deleteMany({
    where: { testId: test.id }
  });

  await prisma.testQuestion.createMany({
    data: QUESTIONS.map(q => ({
      testId: test.id,
      index: q.index,
      text: q.text
    }))
  });

  // Шкалы
  await prisma.testScale.deleteMany({
    where: { testId: test.id }
  });

  await prisma.testScale.createMany({
    data: SCALES.map(s => ({
      testId: test.id,
      key: s.key,
      title: s.title,
      description: s.description
    }))
  });

  console.log("Шмишек (демо) успешно записан в БД, testId =", test.id);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

