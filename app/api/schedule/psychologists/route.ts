import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertModuleEnabled } from "@/lib/platform-modules";

// Список психологов для выбора клиентом
export async function GET() {
  const mod = await assertModuleEnabled("scheduling");
  if (mod) return mod;
  const psychologists = await prisma.psychologistProfile.findMany({
    select: {
      id: true,
      specialization: true,
      user: { select: { firstName: true, lastName: true, name: true } }
    },
    orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }]
  });

  return NextResponse.json(
    psychologists.map(p => ({
      id: p.id,
      fullName:
        [p.user.lastName, p.user.firstName].filter(Boolean).join(" ").trim() ||
        p.user.name ||
        "Психолог",
      specialization: p.specialization ?? null
    }))
  );
}
