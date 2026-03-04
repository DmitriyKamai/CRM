import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

// Список психологов для выбора клиентом
export async function GET() {
  const psychologists = await prisma.psychologistProfile.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialization: true
    },
    orderBy: {
      lastName: "asc"
    }
  });

  return NextResponse.json(
    psychologists.map(p => ({
      id: p.id,
      fullName: `${p.lastName} ${p.firstName}`,
      specialization: p.specialization ?? null
    }))
  );
}

