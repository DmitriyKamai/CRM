import { prisma } from "@/lib/db";

/** Максимум подходов, которые психолог может отметить как «свои». */
export const MAX_THERAPY_APPROACHES_PER_PSYCHOLOGIST = 8;

/** Семейства подходов — для группировки в UI и сортировки. */
export const THERAPY_APPROACH_FAMILIES = [
  "base",
  "third_wave",
  "psychodynamic",
  "couple",
  "brief",
  "trauma",
  "expressive",
  "other"
] as const;

export type TherapyApproachFamily = (typeof THERAPY_APPROACH_FAMILIES)[number];

export const THERAPY_APPROACH_FAMILY_LABELS: Record<TherapyApproachFamily, string> = {
  base: "Основные подходы",
  third_wave: "Третья волна КПТ",
  psychodynamic: "Психодинамические",
  couple: "Парные и семейные",
  brief: "Краткосрочные",
  trauma: "Травматерапия",
  expressive: "Арт- и экспрессивные",
  other: "Другое"
};

export type TherapyApproachDto = {
  slug: string;
  nameRu: string;
  family: TherapyApproachFamily;
  description: string | null;
  orderIndex: number;
};

function toFamily(raw: string): TherapyApproachFamily {
  return (THERAPY_APPROACH_FAMILIES as readonly string[]).includes(raw)
    ? (raw as TherapyApproachFamily)
    : "other";
}

/** Активный справочник подходов, отсортированный для вывода в форме и на публичной странице. */
export async function listActiveTherapyApproaches(): Promise<TherapyApproachDto[]> {
  const rows = await prisma.therapyApproach.findMany({
    where: { isActive: true },
    orderBy: [{ family: "asc" }, { orderIndex: "asc" }, { nameRu: "asc" }],
    select: { slug: true, nameRu: true, family: true, description: true, orderIndex: true }
  });
  return rows.map((r) => ({
    slug: r.slug,
    nameRu: r.nameRu,
    family: toFamily(r.family),
    description: r.description ?? null,
    orderIndex: r.orderIndex
  }));
}

/** Нормализация входа при сохранении: уникальные непустые slug-и, обрезка до лимита. */
export function normalizeTherapyApproachSlugs(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const slug = raw.trim().toLowerCase().slice(0, 64);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= MAX_THERAPY_APPROACHES_PER_PSYCHOLOGIST) break;
  }
  return out;
}
