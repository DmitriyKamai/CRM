"use client";

import { useEffect, useState } from "react";
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

export default function PsychologistDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [clientsCount, setClientsCount] = useState<number | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<number | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.replace("/auth/login?callbackUrl=/psychologist");
      return;
    }
    if ((session.user as any).role !== "PSYCHOLOGIST") {
      router.replace("/");
      return;
    }

    setClientsCount(0);
    setUpcomingAppointments(0);
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Загружаем кабинет психолога...
        </p>
      </div>
    );
  }

  if (!session?.user || (session.user as any).role !== "PSYCHOLOGIST") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Перенаправляем вас на страницу входа...
        </p>
      </div>
    );
  }

  const name = session.user.email ?? "Психолог";

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Кабинет психолога
          </h1>
          <Badge variant="outline">beta</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {name}. Здесь собраны ключевые элементы вашей работы: клиенты,
          расписание и результаты диагностики.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Клиенты</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {clientsCount ?? "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ближайшие записи</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {upcomingAppointments ?? "—"}
            </div>
          </CardContent>
        </Card>

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
              <Button
                size="sm"
                variant="outline"
                className="justify-start"
                onClick={() => router.push("/psychologist/schedule")}
              >
                Открыть расписание и добавить слоты
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="justify-start"
                onClick={() => router.push("/client/psychologists")}
              >
                Посмотреть запись глазами клиента
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

