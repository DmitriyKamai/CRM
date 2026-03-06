/**
 * Тест по изучению акцентуаций характера (детский вариант) Шмишек Х.
 * Основа: концепция акцентуированных личностей К. Леонгарда.
 * Ответы: «да» = 1, «нет» = 0. Баллы по шкалам суммируются по ключу.
 */

export type ShmishekScaleKey =
  | "hyperthymic"
  | "dysthymic"
  | "cyclothymic"
  | "exalted"
  | "anxious"
  | "emotive"
  | "demonstrative"
  | "stuck"
  | "excitable"
  | "pedantic";

export type ShmishekScores = Record<ShmishekScaleKey, number>;

/** Ответ по методике: 0 = «нет», 1 = «да». */
export type ShmishekAnswerValue = 0 | 1;

export interface ShmishekAnswerMap {
  [questionIndex: number]: ShmishekAnswerValue;
}

/**
 * Ключ по детскому варианту (источник: Psylab.info / Инфоурок).
 * «+» — ответ «да» даёт 1 очко, «−» — ответ «нет» даёт 1 очко. Сумма очков умножается на коэффициент (2, 3 или 6). Макс. балл по шкале — 24.
 */
const SCALE_KEY: Record<
  ShmishekScaleKey,
  { yes: number[]; no: number[]; multiplier: number }
> = {
  demonstrative: { yes: [7, 19, 22, 29, 41, 44, 63, 66, 73, 85, 88], no: [51], multiplier: 2 },
  stuck: { yes: [2, 15, 24, 34, 37, 56, 68, 78, 81], no: [12, 46, 59], multiplier: 2 },
  pedantic: { yes: [4, 14, 17, 26, 39, 48, 58, 61, 70, 80, 83], no: [36], multiplier: 2 },
  excitable: { yes: [8, 20, 30, 42, 52, 64, 74, 86], no: [], multiplier: 3 },
  hyperthymic: { yes: [1, 11, 23, 33, 45, 55, 67, 77], no: [], multiplier: 3 },
  dysthymic: { yes: [9, 21, 43, 75, 87], no: [31, 53, 65], multiplier: 3 },
  anxious: { yes: [16, 27, 38, 49, 60, 71, 82], no: [5], multiplier: 3 },
  exalted: { yes: [10, 32, 54, 76], no: [], multiplier: 6 },
  emotive: { yes: [3, 13, 35, 47, 57, 69, 79], no: [25], multiplier: 3 },
  cyclothymic: { yes: [6, 18, 28, 40, 50, 62, 72, 84], no: [], multiplier: 3 }
};

export function computeShmishekScores(answers: ShmishekAnswerMap): ShmishekScores {
  const scores: ShmishekScores = {
    hyperthymic: 0,
    dysthymic: 0,
    cyclothymic: 0,
    exalted: 0,
    anxious: 0,
    emotive: 0,
    demonstrative: 0,
    stuck: 0,
    excitable: 0,
    pedantic: 0
  };

  for (const [scale, { yes, no, multiplier }] of Object.entries(SCALE_KEY) as [ShmishekScaleKey, { yes: number[]; no: number[]; multiplier: number }][]) {
    let count = 0;
    for (const q of yes) if (answers[q] === 1) count++;
    for (const q of no) if (answers[q] === 0) count++;
    scores[scale] = count * multiplier;
  }

  return scores;
}

const ACCENT_THRESHOLD = 18;
const MAX_SCORE = 24;

function interpretScale(key: ShmishekScaleKey, value: number): string {
  const isAccent = value >= ACCENT_THRESHOLD;
  const level: "low" | "medium" | "high" =
    value <= 6 ? "low" : value >= ACCENT_THRESHOLD ? "high" : "medium";

  const scaleLabels: Record<ShmishekScaleKey, string> = {
    hyperthymic: "Гипертимный",
    dysthymic: "Дистимный",
    cyclothymic: "Циклотимный",
    exalted: "Экзальтированный",
    anxious: "Тревожно-боязливый",
    emotive: "Эмотивный",
    demonstrative: "Демонстративный",
    stuck: "Застревающий",
    excitable: "Возбудимый",
    pedantic: "Педантичный"
  };
  const name = scaleLabels[key];

  switch (key) {
    case "hyperthymic":
      if (level === "high" || isAccent)
        return `Выраженные гипертимные черты (${value} баллов): повышенное настроение, активность, общительность, тяга к новым впечатлениям. В детском и подростковом возрасте это часто проявляется живостью, инициативой, иногда недостаточной усидчивостью. Рекомендуется направлять энергию в конструктивное русло.`;
      if (level === "low")
        return `Гипертимные черты выражены слабо (${value} баллов): активность и общительность не доминируют.`;
      return `Умеренные гипертимные черты (${value} баллов): общительность и активность присутствуют без выраженной акцентуации.`;
    case "dysthymic":
      if (level === "high" || isAccent)
        return `Выраженные дистимные черты (${value} баллов): склонность к сниженному настроению, пессимизму, серьёзности. Подросток может казаться «взрослым не по годам», тяжело переживать неудачи. Важна поддержка и включение в посильную активность.`;
      if (level === "low")
        return `Дистимные черты слабо выражены (${value} баллов): фон настроения в целом ровный.`;
      return `Умеренные дистимные черты (${value} баллов): возможны периоды снижения настроения при нагрузках.`;
    case "cyclothymic":
      if (level === "high" || isAccent)
        return `Выраженная циклотимия (${value} баллов): чередование подъёмов и спадов настроения и активности. В подростковом возрасте это может усиливать эмоциональную неустойчивость. Полезен режим и предсказуемость.`;
      if (level === "low")
        return `Циклотимные колебания незначительны (${value} баллов): эмоциональный фон относительно стабилен.`;
      return `Умеренная циклотимия (${value} баллов): возможны перепады настроения без выраженной акцентуации.`;
    case "exalted":
      if (level === "high" || isAccent)
        return `Выраженная экзальтированность (${value} баллов): сильные эмоциональные реакции на события, впечатлительность, вдохновляемость. Подросток может очень ярко переживать и радость, и огорчения. Важно признавать чувства и помогать в их регуляции.`;
      if (level === "low")
        return `Экзальтированность слабо выражена (${value} баллов): реакции чаще сдержанные.`;
      return `Умеренная экзальтированность (${value} баллов): эмоциональная отзывчивость без крайностей.`;
    case "anxious":
      if (level === "high" || isAccent)
        return `Выраженная тревожность (${value} баллов): склонность к беспокойству, сомнениям, страху неудачи и неодобрения. В детском и подростковом возрасте это может проявляться застенчивостью, избеганием новых ситуаций. Рекомендуется постепенное расширение зоны комфорта при поддержке.`;
      if (level === "low")
        return `Тревожность минимальна (${value} баллов): уверенность в новых ситуациях.`;
      return `Умеренная тревожность (${value} баллов): в сложных ситуациях возможны переживания, но они не блокируют деятельность.`;
    case "emotive":
      if (level === "high" || isAccent)
        return `Выраженная эмотивность (${value} баллов): глубокая чувствительность, эмпатия, ранимость. Подросток тонко чувствует отношение других и художественные впечатления. Важно бережное отношение к чувствам и избегание грубой критики.`;
      if (level === "low")
        return `Эмотивные черты слабо выражены (${value} баллов): эмоции более сдержанны.`;
      return `Умеренная эмотивность (${value} баллов): отзывчивость при сохранении устойчивости.`;
    case "demonstrative":
      if (level === "high" || isAccent)
        return `Выраженная демонстративность (${value} баллов): потребность во внимании и признании, склонность к самопрезентации. В подростковом возрасте может проявляться желанием выделяться, играть роли. Важно давать внимание за реальные достижения и помогать различать «игру» и искренность.`;
      if (level === "low")
        return `Демонстративные черты слабо выражены (${value} баллов): нет выраженной потребности привлекать внимание.`;
      return `Умеренная демонстративность (${value} баллов): желание быть замеченным без выраженной акцентуации.`;
    case "stuck":
      if (level === "high" || isAccent)
        return `Выраженное застревание (${value} баллов): долгое удержание обид, несправедливости, настойчивость в достижении цели. Подросток может «зацикливаться» на конфликтах или идеях. Полезно учить переключаться и прощать, сохраняя границы.`;
      if (level === "low")
        return `Застревание слабо выражено (${value} баллов): обиды и неудачи отпускаются относительно легко.`;
      return `Умеренное застревание (${value} баллов): чувствительность к несправедливости при общей способности двигаться дальше.`;
    case "excitable":
      if (level === "high" || isAccent)
        return `Выраженная возбудимость (${value} баллов): импульсивность, трудности с самоконтролем при стрессе, возможны вспышки раздражения. В подростковом возрасте важно чёткие границы и обучение способам снятия напряжения.`;
      if (level === "low")
        return `Возбудимость низкая (${value} баллов): хороший самоконтроль даже в напряжённых ситуациях.`;
      return `Умеренная возбудимость (${value} баллов): в обычных условиях сдержанность; при перегрузке возможны срывы.`;
    case "pedantic":
      if (level === "high" || isAccent)
        return `Выраженная педантичность (${value} баллов): стремление к порядку, точности, правилам. Подросток может тяжело переживать беспорядок и неопределённость. Важно сочетать предсказуемость с гибкостью там, где это возможно.`;
      if (level === "low")
        return `Педантичность слабо выражена (${value} баллов): гибкость к изменениям и неточностям.`;
      return `Умеренная педантичность (${value} баллов): любовь к порядку без ригидности.`;
  }
}

/** Максимальный балл по каждой шкале после умножения по ключу (по методике — 24). */
export const SCALE_MAX: Record<ShmishekScaleKey, number> = {
  hyperthymic: MAX_SCORE,
  dysthymic: MAX_SCORE,
  cyclothymic: MAX_SCORE,
  exalted: MAX_SCORE,
  anxious: MAX_SCORE,
  emotive: MAX_SCORE,
  demonstrative: MAX_SCORE,
  stuck: MAX_SCORE,
  excitable: MAX_SCORE,
  pedantic: MAX_SCORE
};

/** Формирует текст интерпретации: сырые баллы по шкалам (0–24) + развёрнутое описание. */
export function buildShmishekInterpretation(scores: ShmishekScores): string {
  const lines: string[] = [];

  lines.push("СЫРЫЕ РЕЗУЛЬТАТЫ ПО ШКАЛАМ (баллы 0–24)");
  lines.push("Порог акцентуации: 18–19 баллов и выше. 15–19 — тенденция к акцентуации.");
  lines.push("");

  (Object.entries(scores) as [ShmishekScaleKey, number][]).forEach(([key, value]) => {
    const label = scaleLabel(key);
    lines.push(`${label}: ${value} из ${MAX_SCORE} баллов`);
  });

  lines.push("");
  lines.push("ИНТЕРПРЕТАЦИЯ");
  lines.push("");

  (Object.entries(scores) as [ShmishekScaleKey, number][]).forEach(([key, value]) => {
    const text = interpretScale(key, value);
    lines.push(text);
    lines.push("");
  });

  return lines.join("\n").trim();
}

export function scaleLabel(key: ShmishekScaleKey): string {
  switch (key) {
    case "hyperthymic":
      return "Гипертимный тип";
    case "dysthymic":
      return "Дистимный тип";
    case "cyclothymic":
      return "Циклотимный тип";
    case "exalted":
      return "Экзальтированный тип";
    case "anxious":
      return "Тревожно-боязливый тип";
    case "emotive":
      return "Эмотивный тип";
    case "demonstrative":
      return "Демонстративный тип";
    case "stuck":
      return "Застревающий тип";
    case "excitable":
      return "Возбудимый тип";
    case "pedantic":
      return "Педантичный тип";
  }
}
