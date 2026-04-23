"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  TherapyApproachDto,
  TherapyApproachFamily
} from "@/lib/settings/therapy-approaches";

type ApiResponse = {
  approaches: Array<{
    slug: string;
    nameRu: string;
    family: TherapyApproachFamily;
    description: string | null;
    orderIndex: number;
  }>;
};

async function fetchApproaches(): Promise<TherapyApproachDto[]> {
  const res = await fetch("/api/therapy-approaches", { credentials: "same-origin" });
  if (!res.ok) {
    throw new Error("Не удалось загрузить справочник подходов");
  }
  const data = (await res.json()) as ApiResponse;
  return data.approaches;
}

/** Публичный справочник психотерапевтических подходов (для формы настроек и каталога). */
export function useTherapyApproachesDirectory() {
  return useQuery({
    queryKey: ["therapy-approaches", "directory"] as const,
    queryFn: fetchApproaches,
    staleTime: 10 * 60 * 1000
  });
}
