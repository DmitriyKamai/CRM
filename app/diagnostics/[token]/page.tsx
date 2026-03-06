import Link from "next/link";
import { notFound } from "next/navigation";

import { PavlovaTestForm } from "@/components/diagnostics/pavlova-test-form";
import { ShmishekTestForm } from "@/components/diagnostics/shmishek-test-form";
import { prisma } from "@/lib/db";
import { withPrismaLock } from "@/lib/prisma-request-lock";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function DiagnosticByTokenPage({ params }: Props) {
  const { token } = await params;

  let link: Awaited<
    ReturnType<
      typeof prisma.diagnosticLink.findUnique<{
        include: { test: { include: { questions: true } } };
      }>
    >
  >;
  try {
    link = await withPrismaLock(() =>
      prisma.diagnosticLink.findUnique({
        where: { token },
        include: {
          test: {
            include: { questions: true }
          }
        }
      })
    );
  } catch (err) {
    const isConnectionError =
      err &&
      typeof err === "object" &&
      ("name" in err
        ? (err as Error).name === "PrismaClientInitializationError"
        : false);
    if (isConnectionError) {
      return (
        <div className="flex min-h-[70vh] items-center justify-center p-4">
          <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950/30">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Сервис временно недоступен
            </p>
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              Не удалось подключиться к базе данных. Попробуйте обновить страницу через несколько секунд.
            </p>
            <Link
              href={`/diagnostics/${token}`}
              className="mt-4 inline-block text-sm font-medium text-amber-800 underline dark:text-amber-200"
            >
              Обновить страницу
            </Link>
          </div>
        </div>
      );
    }
    throw err;
  }

  if (!link || !link.test || !link.test.isActive) {
    notFound();
  }

  const now = new Date();
  if (link.expiresAt && link.expiresAt < now) {
    notFound();
  }

  if (link.maxUses && link.usedCount >= link.maxUses) {
    notFound();
  }

  const questions = link.test.questions
    .slice()
    .sort((a, b) => a.index - b.index)
    .map(q => ({
      id: q.id,
      index: q.index,
      text: q.text
    }));

  const isPavlova = link.test.type === "PAVLOVA_SHMISHEK";

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      {isPavlova ? (
        <PavlovaTestForm token={token} questions={questions} />
      ) : (
        <ShmishekTestForm token={token} questions={questions} />
      )}
    </div>
  );
}

