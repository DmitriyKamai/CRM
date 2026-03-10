import Link from "next/link";

import { prisma } from "@/lib/db";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const dynamic = "force-dynamic";

const PROFESSION_LABELS: Record<string, string> = {
  psychologist: "Психолог",
  psychotherapist: "Врач-психотерапевт",
  psychiatrist: "Психиатр"
};

function getProfessionLabel(specialization: string | null | undefined): string {
  if (!specialization?.trim()) return "Специалист";
  return PROFESSION_LABELS[specialization.trim()] ?? "Специалист";
}

export default async function PsychologistsListPage() {
  let psychologists: {
    id: string;
    firstName: string;
    lastName: string;
    specialization: string | null;
    bio: string | null;
    profilePhotoUrl: string | null;
    profilePhotoPublished: boolean;
  }[] = [];
  let loadError: string | null = null;

  try {
    const all = await prisma.psychologistProfile.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialization: true,
        bio: true,
        profilePhotoUrl: true,
        profilePhotoPublished: true
      },
      orderBy: { lastName: "asc" }
    });
    psychologists = all.filter((p) => p.profilePhotoPublished);
  } catch (err) {
    console.error("Psychologists list error:", err);
    loadError = err instanceof Error ? err.message : "Не удалось загрузить список.";
  }

  if (loadError) {
    return (
      <div className="space-y-4 rounded-lg border border-destructive/60 bg-destructive/10 p-6 text-destructive">
        <p className="font-medium">Ошибка загрузки</p>
        <p className="text-sm">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Запись к психологу
        </h1>
        <p className="text-sm text-muted-foreground">
          Выберите специалиста и нажмите «Записаться», чтобы выбрать время приёма.
        </p>
      </section>

      {psychologists.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Психологи пока не добавлены.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {psychologists.map((p) => {
            const initials = [p.firstName, p.lastName]
              .filter(Boolean)
              .map((s) => s[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const professionLabel = getProfessionLabel(p.specialization);
            const bioShort = p.bio?.trim()
              ? p.bio.trim().slice(0, 200) + (p.bio.length > 200 ? "…" : "")
              : null;

            return (
              <Link
                key={p.id}
                href={`/client/psychologists/${p.id}`}
                className="group block h-full"
              >
                <Card className="flex h-full flex-col overflow-hidden transition-colors hover:border-primary/60 cursor-pointer">
                  <CardContent className="p-0 flex flex-col">
                    <div className="w-full aspect-square relative bg-muted overflow-hidden rounded-t-lg">
                      <Avatar className="absolute inset-0 h-full w-full rounded-none rounded-t-lg">
                        <AvatarImage
                          src={p.profilePhotoUrl ?? undefined}
                          alt={`${p.firstName} ${p.lastName}`}
                          className="rounded-none rounded-t-lg object-cover"
                        />
                        <AvatarFallback className="rounded-none rounded-t-lg text-4xl font-medium text-muted-foreground">
                          {initials || "?"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="p-4 flex flex-col">
                      <div className="w-full text-center space-y-1">
                        <p className="font-semibold text-foreground">
                          {p.firstName} {p.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {professionLabel}
                        </p>
                      </div>
                      {bioShort && (
                        <p className="mt-3 w-full text-sm text-muted-foreground line-clamp-4 text-left">
                          {bioShort}
                        </p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="mt-auto pt-4 pb-6 px-4">
                    <Button className="w-full" variant="secondary">
                      Записаться
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
