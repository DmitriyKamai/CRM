import Link from "next/link";

import { prisma } from "@/lib/db";

export default async function PsychologistsListPage() {
  let psychologists: { id: string; firstName: string; lastName: string; specialization: string | null }[] = [];
  let loadError: string | null = null;

  try {
    psychologists = await prisma.psychologistProfile.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialization: true
      },
      orderBy: { lastName: "asc" }
    });
  } catch (err) {
    console.error("Psychologists list error:", err);
    loadError = err instanceof Error ? err.message : "Не удалось загрузить список.";
  }

  if (loadError) {
    return (
      <div className="space-y-4 rounded-lg border border-amber-700/60 bg-amber-950/40 p-6 text-amber-200">
        <p className="font-medium">Ошибка загрузки</p>
        <p className="text-sm">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-50">
        Психологи, доступные для записи
      </h1>
      <p className="text-sm text-slate-300">
        Выберите психолога, чтобы просмотреть его свободные слоты и записаться
        на приём.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        {psychologists.length === 0 ? (
          <div className="text-sm text-slate-300">
            Психологи пока не добавлены.
          </div>
        ) : (
          psychologists.map(p => (
            <Link
              key={p.id}
              href={`/client/psychologists/${p.id}`}
              className="card p-4 flex flex-col gap-1 hover:border-sky-500/70 hover:bg-slate-900/80 transition-colors"
            >
              <div className="font-medium text-slate-50">
                {p.lastName} {p.firstName}
              </div>
              {p.specialization && (
                <div className="text-xs text-slate-300">
                  {p.specialization}
                </div>
              )}
              <div className="text-xs text-slate-500">
                Нажмите, чтобы выбрать время приёма
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

