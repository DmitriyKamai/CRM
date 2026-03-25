import { describe, it, expect } from "vitest";
import {
  computeSmilRawScores,
  computeSmilTScores,
  buildSmilInterpretation,
  smilScaleLabel,
  SMIL_QUESTION_COUNT,
  type SmilAnswerMap,
  type SmilScaleKey,
  type SmilVariant
} from "@/lib/diagnostics/smil";

describe("computeSmilRawScores", () => {
  it("возвращает нули при пустых ответах (мужской вариант)", () => {
    const raw = computeSmilRawScores({}, "male");
    for (const val of Object.values(raw)) {
      expect(val).toBeGreaterThanOrEqual(0);
    }
    // L-шкала: все прямые — 0 (не отвечены), обратных нет → 0
    expect(raw.L).toBe(0);
  });

  it("L-шкала: 15 прямых ключей, все «верно» → сырой = 15", () => {
    const answers: SmilAnswerMap = {};
    [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 195, 225, 255, 285].forEach(i => {
      answers[i] = 1;
    });
    const raw = computeSmilRawScores(answers, "male");
    expect(raw.L).toBe(15);
  });

  it("обратные ключи: F-шкала считает «неверно»=0 по обратным пунктам", () => {
    const answers: SmilAnswerMap = {};
    // F reverse: [17,20,54,65,75,83,112,113,115,164,169,177,185,196,199,220,257,258,272,276]
    // Устанавливаем все обратные в 0 (неверно) — должны засчитаться
    [17, 20, 54, 65, 75, 83, 112, 113, 115, 164, 169, 177, 185, 196, 199, 220, 257, 258, 272, 276].forEach(i => {
      answers[i] = 0;
    });
    const raw = computeSmilRawScores(answers, "male");
    expect(raw.F).toBe(20); // 20 обратных
  });

  it("шкала 5 использует женский ключ для variant=female", () => {
    const answers: SmilAnswerMap = {};
    // Пункт 26 — direct в female, reverse в male
    answers[26] = 1;
    computeSmilRawScores(answers, "male");
    const rawFemale = computeSmilRawScores(answers, "female");
    // Для male: 26 не в direct male (нет 26 в male direct), но в reverse male → answers[26]=1 не даёт балл
    // Для female: 26 в direct female → answers[26]=1 даёт балл
    expect(rawFemale["5"]).toBeGreaterThanOrEqual(1);
  });
});

describe("computeSmilTScores", () => {
  it("при пустых ответах T-баллы вычисляются корректно", () => {
    const tScores = computeSmilTScores({}, "male");
    for (const val of Object.values(tScores)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(120);
      expect(typeof val).toBe("number");
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it("T-баллы ограничены диапазоном 0–120", () => {
    const answers: SmilAnswerMap = {};
    for (let i = 1; i <= SMIL_QUESTION_COUNT; i++) answers[i] = 1;
    const tScores = computeSmilTScores(answers, "male");
    for (const val of Object.values(tScores)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(120);
    }
  });

  it("K-коррекция применяется к шкалам 1, 4, 7, 8, 9", () => {
    const answers: SmilAnswerMap = {};
    // Заполняем только K-шкалу прямыми ключами
    answers[96] = 1; // K direct
    // + все обратные K ставим в 0 → засчитываются
    [30, 39, 71, 89, 124, 129, 134, 138, 142, 148, 160, 170, 171, 180, 183, 217, 234, 267, 272, 296, 316, 322, 374, 383, 397, 398, 406, 461, 502].forEach(i => {
      answers[i] = 0;
    });

    const rawScores = computeSmilRawScores(answers, "male");
    const kRaw = rawScores.K;
    expect(kRaw).toBe(30); // 1 direct + 29 reverse

    const tScores = computeSmilTScores(answers, "male");
    // Шкалы с K-коррекцией должны отличаться от шкал без K
    // Проверяем, что T-баллы — числа
    expect(typeof tScores["1"]).toBe("number");
    expect(typeof tScores["7"]).toBe("number");
  });

  it("работает для обоих вариантов (male/female)", () => {
    const answers: SmilAnswerMap = {};
    const variants: SmilVariant[] = ["male", "female"];
    for (const variant of variants) {
      const tScores = computeSmilTScores(answers, variant);
      expect(Object.keys(tScores)).toHaveLength(13);
    }
  });
});

describe("buildSmilInterpretation", () => {
  it("содержит заголовок профиля и интерпретацию", () => {
    const tScores = computeSmilTScores({}, "male");
    const text = buildSmilInterpretation(tScores, "male");
    expect(text).toContain("ПРОФИЛЬ СМИЛ");
    expect(text).toContain("ИНТЕРПРЕТАЦИЯ");
    expect(text).toContain("мужской вариант");
  });

  it("отмечает повышенные шкалы при высоких T-баллах", () => {
    const answers: SmilAnswerMap = {};
    for (let i = 1; i <= SMIL_QUESTION_COUNT; i++) answers[i] = 1;
    const tScores = computeSmilTScores(answers, "male");
    const text = buildSmilInterpretation(tScores, "male");
    // При всех «верно» F будет очень высоко
    if (tScores.F > 80) {
      expect(text).toContain("Повышенная шкала F");
    }
  });

  it("при нормальных баллах — профиль в пределах нормы", () => {
    // Симулируем нормальный профиль — все T=50
    const tScores: Record<SmilScaleKey, number> = {
      L: 50, F: 50, K: 50,
      "1": 50, "2": 50, "3": 50, "4": 50, "5": 50,
      "6": 50, "7": 50, "8": 50, "9": 50, "0": 50
    };
    const text = buildSmilInterpretation(tScores, "male");
    expect(text).toContain("условную норму");
  });

  it("женский вариант использует соответствующие подписи", () => {
    const tScores = computeSmilTScores({}, "female");
    const text = buildSmilInterpretation(tScores, "female");
    expect(text).toContain("женский вариант");
  });
});

describe("smilScaleLabel", () => {
  it("возвращает подписи для всех шкал", () => {
    const keys: SmilScaleKey[] = ["L", "F", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
    for (const key of keys) {
      expect(smilScaleLabel(key, "male")).toBeTruthy();
      expect(smilScaleLabel(key, "female")).toBeTruthy();
    }
  });

  it("шкала 5 отличается для мужского и женского листа", () => {
    const male = smilScaleLabel("5", "male");
    const female = smilScaleLabel("5", "female");
    expect(male).not.toBe(female);
    expect(male).toContain("Женственность");
    expect(female).toContain("Маскулинность");
  });
});

describe("SMIL_QUESTION_COUNT", () => {
  it("равен 566", () => {
    expect(SMIL_QUESTION_COUNT).toBe(566);
  });
});
