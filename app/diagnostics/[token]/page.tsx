import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { ShmishekTestForm } from "@/components/diagnostics/shmishek-test-form";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function DiagnosticByTokenPage({ params }: Props) {
  const { token } = await params;

  const link = await prisma.diagnosticLink.findUnique({
    where: { token },
    include: {
      test: {
        include: { questions: true }
      }
    }
  });

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

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <ShmishekTestForm token={token} questions={questions} />
    </div>
  );
}

