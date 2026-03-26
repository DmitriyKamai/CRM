import { useQuery } from "@tanstack/react-query";

import type { DiagnosticsVariant } from "@/store/slices/diagnostics-progress.slice";

export interface QuestionDto {
  id: string;
  index: number;
  text: string;
}

async function fetchQuestionsApi(variant: DiagnosticsVariant): Promise<QuestionDto[]> {
  const res = await fetch(
    `/api/diagnostics/smil/questions?variant=${encodeURIComponent(variant)}`
  );
  if (!res.ok) throw new Error("Не удалось загрузить вопросы");
  const data = await res.json();
  return Array.isArray(data.questions) ? data.questions : [];
}

export function useSmilQuestions(variant: DiagnosticsVariant | null) {
  const { data: questions = [], isLoading, error } = useQuery({
    queryKey: ["smil-questions", variant],
    queryFn: () => fetchQuestionsApi(variant!),
    enabled: !!variant,
    staleTime: Infinity,
    gcTime: Infinity
  });

  return {
    questions,
    questionsLoading: isLoading,
    questionError: error instanceof Error ? error.message : null
  };
}
