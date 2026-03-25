import { describe, it, expect } from "vitest";
import {
  computeShmishekScores,
  buildShmishekInterpretation,
  scaleLabel,
  SCALE_MAX,
  type ShmishekAnswerMap,
  type ShmishekScaleKey
} from "@/lib/diagnostics/shmishek";

describe("computeShmishekScores", () => {
  it("возвращает нули при пустых ответах", () => {
    const scores = computeShmishekScores({});
    for (const val of Object.values(scores)) {
      expect(val).toBe(0);
    }
  });

  it("возвращает нули при всех ответах «нет»=0, кроме обратных ключей", () => {
    const answers: ShmishekAnswerMap = {};
    for (let i = 1; i <= 88; i++) answers[i] = 0;
    const scores = computeShmishekScores(answers);

    // Шкалы с обратными ключами (no-items) получают баллы при ответе «нет»=0
    // demonstrative: no=[51], stuck: no=[12,46,59], pedantic: no=[36],
    // dysthymic: no=[31,53,65], anxious: no=[5], emotive: no=[25]
    expect(scores.demonstrative).toBe(1 * 2); // 1 обратный × 2
    expect(scores.stuck).toBe(3 * 2);         // 3 обратных × 2
    expect(scores.pedantic).toBe(1 * 2);      // 1 обратный × 2
    expect(scores.dysthymic).toBe(3 * 3);     // 3 обратных × 3
    expect(scores.anxious).toBe(1 * 3);       // 1 обратный × 3
    expect(scores.emotive).toBe(1 * 3);       // 1 обратный × 3

    // Шкалы без обратных ключей = 0
    expect(scores.excitable).toBe(0);
    expect(scores.hyperthymic).toBe(0);
    expect(scores.exalted).toBe(0);
    expect(scores.cyclothymic).toBe(0);
  });

  it("корректно считает гипертимную шкалу при всех «да»", () => {
    const answers: ShmishekAnswerMap = {};
    // hyperthymic: yes=[1,11,23,33,45,55,67,77], no=[], multiplier=3
    [1, 11, 23, 33, 45, 55, 67, 77].forEach(q => { answers[q] = 1; });
    const scores = computeShmishekScores(answers);
    expect(scores.hyperthymic).toBe(8 * 3); // 24 — максимум
  });

  it("экзальтированная шкала при всех «да» = 24 (4 вопроса × 6)", () => {
    const answers: ShmishekAnswerMap = {};
    [10, 32, 54, 76].forEach(q => { answers[q] = 1; });
    const scores = computeShmishekScores(answers);
    expect(scores.exalted).toBe(4 * 6); // 24
  });

  it("максимальные баллы по всем шкалам не превышают 24", () => {
    const answers: ShmishekAnswerMap = {};
    for (let i = 1; i <= 88; i++) answers[i] = 1;
    const scores = computeShmishekScores(answers);

    for (const [key, value] of Object.entries(scores)) {
      expect(value).toBeLessThanOrEqual(SCALE_MAX[key as ShmishekScaleKey]);
    }
  });

  it("корректно работает с обратными ключами (демонстративная шкала)", () => {
    const answers: ShmishekAnswerMap = {};
    // demonstrative: yes=[7,19,22,29,41,44,63,66,73,85,88], no=[51], multiplier=2
    [7, 19, 22, 29, 41, 44, 63, 66, 73, 85, 88].forEach(q => { answers[q] = 1; });
    answers[51] = 0; // обратный ключ: «нет» даёт балл
    const scores = computeShmishekScores(answers);
    expect(scores.demonstrative).toBe(12 * 2); // 11 yes + 1 no = 12, × 2 = 24
  });
});

describe("buildShmishekInterpretation", () => {
  it("генерирует интерпретацию с правильными секциями", () => {
    const scores = computeShmishekScores({});
    const text = buildShmishekInterpretation(scores);

    expect(text).toContain("СЫРЫЕ РЕЗУЛЬТАТЫ ПО ШКАЛАМ");
    expect(text).toContain("ИНТЕРПРЕТАЦИЯ");
    expect(text).toContain("Порог акцентуации");
  });

  it("отмечает выраженные черты при высоких баллах", () => {
    const answers: ShmishekAnswerMap = {};
    [1, 11, 23, 33, 45, 55, 67, 77].forEach(q => { answers[q] = 1; });
    const scores = computeShmishekScores(answers);
    expect(scores.hyperthymic).toBe(24);
    const text = buildShmishekInterpretation(scores);
    expect(text).toContain("Выраженные гипертимные черты");
  });

  it("включает слабо выраженные черты при нулевых баллах", () => {
    const scores = computeShmishekScores({});
    const text = buildShmishekInterpretation(scores);
    expect(text).toContain("слабо выражен");
  });
});

describe("scaleLabel", () => {
  it("возвращает русское название для каждой шкалы", () => {
    const scales: ShmishekScaleKey[] = [
      "hyperthymic", "dysthymic", "cyclothymic", "exalted",
      "anxious", "emotive", "demonstrative", "stuck", "excitable", "pedantic"
    ];
    for (const scale of scales) {
      const label = scaleLabel(scale);
      expect(label).toBeTruthy();
      expect(label).toContain("тип");
    }
  });
});
