/**
 * Вопросы СМИЛ по вариантам (источник: Psylab.info):
 * — мужской: smil-questions-male.json;
 * — женский: smil-questions-female.json (формулировки в женском роде, шкала 5 — ключ ММ);
 * — подростковый для мальчиков 13–15 лет: smil-questions-adolescent.json («обвести кружочком», формулировки для подростков).
 */

import maleQuestions from "./smil-questions-male.json";
import femaleQuestions from "./smil-questions-female.json";
import adolescentQuestions from "./smil-questions-adolescent.json";

export type SmilQuestionVariant = "male" | "female" | "adolescent";

export interface SmilQuestion {
  index: number;
  text: string;
}

function toSortedList(data: { index: number; text: string }[]): SmilQuestion[] {
  return (data as SmilQuestion[]).slice().sort((a, b) => a.index - b.index);
}

const maleList = toSortedList(maleQuestions as { index: number; text: string }[]);
const femaleList = toSortedList(femaleQuestions as { index: number; text: string }[]);
const adolescentList = toSortedList(adolescentQuestions as { index: number; text: string }[]);

export function getSmilQuestions(variant: SmilQuestionVariant): SmilQuestion[] {
  switch (variant) {
    case "female":
      return femaleList;
    case "adolescent":
      return adolescentList;
    default:
      return maleList;
  }
}
