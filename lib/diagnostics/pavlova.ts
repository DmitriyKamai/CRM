/**
 * Личностный опросник для определения типа акцентуаций К. Леонгарда, Г. Шмишека
 * (адаптация Павлова Г.Г., 2025). 3-балльная шкала: «да»=2, «в некоторой степени»=1, «нет»=0.
 * Ключ и нормы — по статье Павлова Г.Г. Экстремальная психология и безопасность личности. 2025. Т. 2. № 1.
 */

export type PavlovaScaleKey =
  | "hyperthymic"
  | "stuck"
  | "emotive"
  | "pedantic"
  | "anxious"
  | "cyclothymic"
  | "demonstrative"
  | "excitable"
  | "dysthymic"
  | "exalted";

export type PavlovaScores = Record<PavlovaScaleKey, number>;

/** Ответ по методике Павловой: 0 = «нет», 1 = «в некоторой степени», 2 = «да». */
export type PavlovaAnswerValue = 0 | 1 | 2;

export interface PavlovaAnswerMap {
  [questionIndex: number]: PavlovaAnswerValue;
}

/**
 * Ключ по приложению статьи Павлова Г.Г. (2025).
 * yes — номера вопросов, где «да» увеличивает балл; no — где «нет» увеличивает балл.
 * Для 3-балльной шкалы: по «да»-пунктам да=2, в некоторой степени=1, нет=0;
 * по «нет»-пунктам нет=2, в некоторой степени=1, да=0. Сумма по пунктам умножается на коэффициент.
 */
const SCALE_KEY: Record<
  PavlovaScaleKey,
  { yes: number[]; no: number[]; multiplier: number }
> = {
  hyperthymic: { yes: [1, 11, 23, 33, 45, 55, 67, 77], no: [], multiplier: 3 },
  stuck: {
    yes: [2, 15, 24, 34, 37, 56, 68, 78, 81],
    no: [12, 46, 59],
    multiplier: 2
  },
  emotive: {
    yes: [3, 13, 35, 47, 57, 69, 79],
    no: [25],
    multiplier: 3
  },
  pedantic: {
    yes: [4, 14, 17, 26, 36, 48, 58, 61, 70, 80, 83],
    no: [39],
    multiplier: 2
  },
  anxious: {
    yes: [6, 27, 38, 49, 60, 71, 82],
    no: [5],
    multiplier: 3
  },
  cyclothymic: {
    yes: [8, 18, 28, 40, 50, 62, 72, 84],
    no: [],
    multiplier: 3
  },
  demonstrative: {
    yes: [7, 19, 22, 29, 41, 44, 63, 66, 73, 85, 88],
    no: [51],
    multiplier: 2
  },
  excitable: {
    yes: [20, 30, 42, 52, 64, 75, 86],
    no: [],
    multiplier: 3
  },
  dysthymic: {
    yes: [9, 21, 43, 74, 87],
    no: [31, 53, 65],
    multiplier: 3
  },
  exalted: { yes: [10, 32, 54, 76], no: [], multiplier: 6 }
};

function itemScore(
  answers: PavlovaAnswerMap,
  questionNum: number,
  isYesKey: boolean
): number {
  const v = answers[questionNum];
  if (v === undefined) return 0;
  if (isYesKey) return v; // да=2, в некоторой степени=1, нет=0
  return 2 - v; // нет=2, в некоторой степени=1, да=0
}

export function computePavlovaScores(
  answers: PavlovaAnswerMap
): PavlovaScores {
  const scores: PavlovaScores = {
    hyperthymic: 0,
    stuck: 0,
    emotive: 0,
    pedantic: 0,
    anxious: 0,
    cyclothymic: 0,
    demonstrative: 0,
    excitable: 0,
    dysthymic: 0,
    exalted: 0
  };

  for (const [scale, { yes, no, multiplier }] of Object.entries(
    SCALE_KEY
  ) as [
    PavlovaScaleKey,
    { yes: number[]; no: number[]; multiplier: number }
  ][]) {
    let raw = 0;
    for (const q of yes) raw += itemScore(answers, q, true);
    for (const q of no) raw += itemScore(answers, q, false);
    scores[scale] = raw * multiplier;
  }

  return scores;
}

const ACCENT_THRESHOLD = 38;
const MAX_SCORE = 48;
const NORM_LOW_MAX = 17;

function interpretScale(key: PavlovaScaleKey, value: number): string {
  const level: "low" | "medium" | "high" =
    value <= NORM_LOW_MAX
      ? "low"
      : value >= ACCENT_THRESHOLD
        ? "high"
        : "medium";

  switch (key) {
    case "hyperthymic":
      if (level === "high")
        return `Гипертимный тип (${value} баллов): выражены повышенный фон настроения, оптимизм, активность, общительность, предприимчивость. Характерны жизнерадостность, тяга к новым впечатлениям, хорошая переносимость нагрузок. При акцентуации возможны недостаточная усидчивость и дисциплинированность.`;
      if (level === "low")
        return `Гипертимный тип (${value} баллов): активность и общительность выражены слабо, фон настроения не доминирует.`;
      return `Гипертимный тип (${value} баллов): умеренная общительность и активность без выраженной акцентуации.`;
    case "stuck":
      if (level === "high")
        return `Застревающий тип (${value} баллов): выражены стойкость аффекта, обидчивость, упорство в отстаивании своих интересов и в достижении цели. Характерны долгое удержание переживаний несправедливости, принципиальность. При акцентуации возможны застревание на конфликтах и идеях, злопамятность.`;
      if (level === "low")
        return `Застревающий тип (${value} баллов): обиды и неудачи отпускаются относительно легко, застревание не выражено.`;
      return `Застревающий тип (${value} баллов): умеренная чувствительность к несправедливости при способности двигаться дальше.`;
    case "emotive":
      if (level === "high")
        return `Эмотивный тип (${value} баллов): выражены впечатлительность, чувствительность, глубина переживаний, эмпатия. Характерны отзывчивость, тонкое восприятие искусства и отношения окружающих. При акцентуации возможна ранимость, потребность в эмоциональной поддержке.`;
      if (level === "low")
        return `Эмотивный тип (${value} баллов): эмоции более сдержанны, эмотивность не доминирует.`;
      return `Эмотивный тип (${value} баллов): умеренная отзывчивость и чувствительность при общей устойчивости.`;
    case "pedantic":
      if (level === "high")
        return `Педантичный тип (${value} баллов): выражены ригидность, стремление к порядку и точности, склонность к проверкам и перепроверкам. Характерны добросовестность, тяга к завершённости дел. При акцентуации возможны трудности с неопределённостью и беспорядком, излишняя формальность.`;
      if (level === "low")
        return `Педантичный тип (${value} баллов): гибкость к изменениям и неточностям, педантичность слабо выражена.`;
      return `Педантичный тип (${value} баллов): умеренное стремление к порядку без выраженной ригидности.`;
    case "anxious":
      if (level === "high")
        return `Тревожно-боязливый тип (${value} баллов): выражены склонность к страхам, тревоге, робость, ожидание неблагоприятных исходов. Характерны чувствительность к оценкам окружающих, неуверенность в новых ситуациях. При акцентуации возможны избегание риска и принятия решений, потребность в поддержке.`;
      if (level === "low")
        return `Тревожно-боязливый тип (${value} баллов): тревожность минимальна, уверенность в ситуациях неопределённости.`;
      return `Тревожно-боязливый тип (${value} баллов): умеренная тревога в сложных ситуациях без блокировки деятельности.`;
    case "cyclothymic":
      if (level === "high")
        return `Циклотимный тип (${value} баллов): выражены чередование подъёмов и спадов настроения и активности. Характерны периоды общительности и энергии, сменяющиеся снижением настроения и пассивностью. При акцентуации колебания могут влиять на работоспособность и отношения.`;
      if (level === "low")
        return `Циклотимный тип (${value} баллов): эмоциональный фон относительно стабилен, циклотимные колебания незначительны.`;
      return `Циклотимный тип (${value} баллов): возможны перепады настроения без выраженной акцентуации.`;
    case "demonstrative":
      if (level === "high")
        return `Демонстративный тип (${value} баллов): выражены потребность во внимании и признании, склонность к самопрезентации, артистичность. Характерны способность к вытеснению неприятного, живая мимика и жесты. При акцентуации возможны театральность, зависимость от оценки окружающих.`;
      if (level === "low")
        return `Демонстративный тип (${value} баллов): выраженной потребности привлекать внимание нет.`;
      return `Демонстративный тип (${value} баллов): умеренное желание быть замеченным без выраженной акцентуации.`;
    case "excitable":
      if (level === "high")
        return `Возбудимый тип (${value} баллов): выражены импульсивность, ослабление контроля над побуждениями при стрессе, возможны вспышки раздражения. Характерны прямолинейность, нетерпеливость. При акцентуации возможны срывы в напряжённых ситуациях, важно обучение способам регуляции.`;
      if (level === "low")
        return `Возбудимый тип (${value} баллов): хороший самоконтроль даже в напряжённых ситуациях.`;
      return `Возбудимый тип (${value} баллов): в обычных условиях сдержанность; при перегрузке возможны срывы.`;
    case "dysthymic":
      if (level === "high")
        return `Дистимный тип (${value} баллов): выражены сниженный фон настроения, пессимизм, фиксация на теневых сторонах жизни, заторможенность. Характерны серьёзность, глубина переживаний. При акцентуации возможны трудности с мобилизацией и принятием решений, важна поддержка.`;
      if (level === "low")
        return `Дистимный тип (${value} баллов): фон настроения в целом ровный, дистимные черты слабо выражены.`;
      return `Дистимный тип (${value} баллов): возможны периоды снижения настроения при нагрузках без выраженной акцентуации.`;
    case "exalted":
      if (level === "high")
        return `Экзальтированный тип (${value} баллов): выражены лёгкость перехода от восторга к печали, сильные эмоциональные реакции, впечатлительность. Характерны вдохновляемость, отзывчивость на события. При акцентуации возможны резкие перепады настроения, важно признание чувств и помощь в регуляции.`;
      if (level === "low")
        return `Экзальтированный тип (${value} баллов): эмоциональные реакции чаще сдержанные.`;
      return `Экзальтированный тип (${value} баллов): умеренная эмоциональная отзывчивость без крайностей.`;
  }
}

export const SCALE_MAX: Record<PavlovaScaleKey, number> = {
  hyperthymic: MAX_SCORE,
  stuck: MAX_SCORE,
  emotive: MAX_SCORE,
  pedantic: MAX_SCORE,
  anxious: MAX_SCORE,
  cyclothymic: MAX_SCORE,
  demonstrative: MAX_SCORE,
  excitable: MAX_SCORE,
  dysthymic: MAX_SCORE,
  exalted: MAX_SCORE
};

const SCALE_LABEL_SHORT: Record<PavlovaScaleKey, string> = {
  hyperthymic: "гипертимный",
  stuck: "застревающий",
  emotive: "эмотивный",
  pedantic: "педантичный",
  anxious: "тревожно-боязливый",
  cyclothymic: "циклотимный",
  demonstrative: "демонстративный",
  excitable: "возбудимый",
  dysthymic: "дистимный",
  exalted: "экзальтированный"
};

/** Нормы: 0–17 — низкие, 18–37 — средние, 38 и более — высокие (акцентуация). */
export function buildPavlovaInterpretation(scores: PavlovaScores): string {
  const lines: string[] = [];

  lines.push("РЕЗУЛЬТАТЫ ПО ШКАЛАМ (баллы 0–48)");
  lines.push(
    "Нормы: 0–17 — низкие значения; 18–37 — средние; 38 и более — высокие (акцентуация)."
  );
  lines.push("");

  (Object.entries(scores) as [PavlovaScaleKey, number][]).forEach(
    ([key, value]) => {
      const label = scaleLabel(key);
      lines.push(`${label}: ${value} из ${MAX_SCORE} баллов`);
    }
  );

  const accentuated = (Object.entries(scores) as [PavlovaScaleKey, number][])
    .filter(([, v]) => v >= ACCENT_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => SCALE_LABEL_SHORT[k]);

  lines.push("");
  lines.push("КРАТКОЕ ЗАКЛЮЧЕНИЕ");
  lines.push("");

  if (accentuated.length > 0) {
    lines.push(
      `Выраженные акцентуации (38 и выше баллов): ${accentuated.join(", ")} тип.`
    );
    if (accentuated.length > 1) {
      lines.push(
        `Наиболее выражена шкала «${accentuated[0]} тип».`
      );
    }
  } else {
    lines.push(
      "Выраженных акцентуаций (38 и выше баллов) не выявлено. Показатели по шкалам находятся в низком или среднем диапазоне (норма)."
    );
  }

  lines.push("");
  lines.push("ИНТЕРПРЕТАЦИЯ ПО ШКАЛАМ");
  lines.push("");

  (Object.entries(scores) as [PavlovaScaleKey, number][]).forEach(
    ([key, value]) => {
      lines.push(interpretScale(key, value));
      lines.push("");
    }
  );

  return lines.join("\n").trim();
}

export function scaleLabel(key: PavlovaScaleKey): string {
  const labels: Record<PavlovaScaleKey, string> = {
    hyperthymic: "Гипертимный тип",
    stuck: "Застревающий тип",
    emotive: "Эмотивный тип",
    pedantic: "Педантичный тип",
    anxious: "Тревожно-боязливый тип",
    cyclothymic: "Циклотимный тип",
    demonstrative: "Демонстративный тип",
    excitable: "Возбудимый тип",
    dysthymic: "Дистимный тип",
    exalted: "Экзальтированный тип"
  };
  return labels[key];
}
