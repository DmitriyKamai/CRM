"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type UserWithRole = { role?: "UNSPECIFIED" | "ADMIN" | "CLIENT" | "PSYCHOLOGIST" | string };

type Props = {
  schedulingEnabled: boolean;
  diagnosticsEnabled: boolean;
};

export function PsychologistDashboardClient({
  schedulingEnabled,
  diagnosticsEnabled
}: Props) {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [clientsCount] = useState<number>(0);
  const [upcomingAppointments] = useState<number>(0);
  const sessionRefreshTried = useRef(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.replace("/auth/login?callbackUrl=/psychologist");
      return;
    }
    const role = (session.user as UserWithRole).role;
    // Сразу после credentials signIn JWT на клиенте иногда без role — один раз подтягиваем сессию.
    if (role === undefined && !sessionRefreshTried.current) {
      sessionRefreshTried.current = true;
      void update();
      return;
    }
    if (role === "UNSPECIFIED") {
      router.replace("/auth/choose-role");
      return;
    }
    if (role !== "PSYCHOLOGIST") {
      router.replace("/?forbidden=1");
      return;
    }
  }, [status, session, router, update]);

  if (status === "loading") {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-[28rem] max-w-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    );
  }

  const role = (session?.user as UserWithRole | undefined)?.role;
  if (
    !session?.user ||
    role === undefined ||
    role === "UNSPECIFIED" ||
    role !== "PSYCHOLOGIST"
  ) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">Проверяем доступ…</p>
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  const name = session.user.email ?? "Психолог";

  const subtitleParts: string[] = ["клиенты"];
  if (schedulingEnabled) subtitleParts.push("расписание");
  if (diagnosticsEnabled) subtitleParts.push("результаты диагностики");
  const subtitle =
    subtitleParts.length > 0
      ? `Здесь собраны ключевые элементы вашей работы: ${subtitleParts.join(", ")}.`
      : "Здесь собраны ключевые элементы вашей работы.";

  return (
    <div className="p-6 space-y-6">
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Кабинет психолога</h1>
          <Badge variant="outline">beta</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {name}. {subtitle}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Клиенты</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{clientsCount}</div>
          </CardContent>
        </Card>

        {schedulingEnabled && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Ближайшие записи</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{upcomingAppointments}</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Быстрые действия</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                className="justify-start"
                onClick={() => router.push("/psychologist/clients")}
              >
                Открыть список клиентов
              </Button>
              {schedulingEnabled && (
                <Button
                  size="sm"
                  variant="outline"
                  className="justify-start"
                  onClick={() => router.push("/psychologist/schedule")}
                >
                  Открыть расписание и добавить слоты
                </Button>
              )}
              {schedulingEnabled && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="justify-start"
                  onClick={() => router.push("/client/psychologists")}
                >
                  Посмотреть запись глазами клиента
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
