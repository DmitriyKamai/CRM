import { describe, it, expect } from "vitest";
import {
  computePavlovaScores,
  buildPavlovaInterpretation,
  scaleLabel,
  SCALE_MAX,
  type PavlovaAnswerMap,
  type PavlovaScaleKey
} from "@/lib/diagnostics/pavlova";

describe("computePavlovaScores", () => {
  it("возвращает нули при пустых ответах", () => {
    const scores = computePavlovaScores({});
    for (const val of Object.values(scores)) {
      expect(val).toBe(0);
    }
  });

  it("максимальный гипертимный балл при всех «да»=2", () => {
    const answers: PavlovaAnswerMap = {};
    // hyperthymic: yes=[1,11,23,33,45,55,67,77], no=[], multiplier=3
    [1, 11, 23, 33, 45, 55, 67, 77].forEach(q => { answers[q] = 2; });
    const scores = computePavlovaScores(answers);
    // 8 вопросов × 2 (да) = 16 сырых × 3 = 48
    expect(scores.hyperthymic).toBe(48);
  });

  it("обратные ключи: «нет»=0 даёт 2 балла по обратному пункту", () => {
    const answers: PavlovaAnswerMap = {};
    // emotive: yes=[3,13,35,47,57,69,79], no=[25], multiplier=3
    answers[25] = 0; // обратный ключ: нет=0 → 2-0=2
    const scores = computePavlovaScores(answers);
    expect(scores.emotive).toBe(2 * 3); // 1 пункт × 2 балла × 3
  });

  it("«в некоторой степени»=1 даёт 1 балл по прямому и обратному ключу", () => {
    const answers: PavlovaAnswerMap = {};
    answers[1] = 1; // прямой ключ hyperthymic → 1
    answers[25] = 1; // обратный ключ emotive → 2-1=1
    const scores = computePavlovaScores(answers);
    expect(scores.hyperthymic).toBe(1 * 3);
    expect(scores.emotive).toBe(1 * 3);
  });

  it("экзальтированная шкала: 4 вопроса × 2 × 6 = 48", () => {
    const answers: PavlovaAnswerMap = {};
    [10, 32, 54, 76].forEach(q => { answers[q] = 2; });
    const scores = computePavlovaScores(answers);
    expect(scores.exalted).toBe(4 * 2 * 6);
    expect(scores.exalted).toBe(SCALE_MAX.exalted);
  });

  it("все баллы не превышают максимум 48", () => {
    const answers: PavlovaAnswerMap = {};
    for (let i = 1; i <= 88; i++) answers[i] = 2;
    const scores = computePavlovaScores(answers);
    for (const [key, value] of Object.entries(scores)) {
      expect(value).toBeLessThanOrEqual(SCALE_MAX[key as PavlovaScaleKey]);
    }
  });
});

describe("buildPavlovaInterpretation", () => {
  it("содержит результаты и интерпретацию", () => {
    const scores = computePavlovaScores({});
    const text = buildPavlovaInterpretation(scores);
    expect(text).toContain("РЕЗУЛЬТАТЫ ПО ШКАЛАМ");
    expect(text).toContain("КРАТКОЕ ЗАКЛЮЧЕНИЕ");
    expect(text).toContain("ИНТЕРПРЕТАЦИЯ ПО ШКАЛАМ");
  });

  it("при нулях — нет акцентуаций", () => {
    const scores = computePavlovaScores({});
    const text = buildPavlovaInterpretation(scores);
    expect(text).toContain("Выраженных акцентуаций");
    expect(text).toContain("не выявлено");
  });

  it("при высоких баллах — перечислены акцентуации", () => {
    const answers: PavlovaAnswerMap = {};
    [1, 11, 23, 33, 45, 55, 67, 77].forEach(q => { answers[q] = 2; });
    const scores = computePavlovaScores(answers);
    expect(scores.hyperthymic).toBe(48);
    const text = buildPavlovaInterpretation(scores);
    expect(text).toContain("гипертимный тип");
  });
});

describe("scaleLabel", () => {
  it("возвращает русское название для каждой шкалы", () => {
    const scales: PavlovaScaleKey[] = [
      "hyperthymic", "stuck", "emotive", "pedantic", "anxious",
      "cyclothymic", "demonstrative", "excitable", "dysthymic", "exalted"
    ];
    for (const scale of scales) {
      const label = scaleLabel(scale);
      expect(label).toBeTruthy();
      expect(label).toContain("тип");
    }
  });
});
