import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const psychologists = await prisma.psychologistProfile.findMany({
      where: {
        // Публичные профили, видимые клиентам
        profilePublished: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialization: true,
        bio: true,
        country: true,
        city: true,
        profilePhotoUrl: true
      },
      orderBy: { lastName: "asc" }
    });

    return NextResponse.json({ psychologists });
  } catch (err) {
    console.error("[GET /api/client/psychologists]", err);
    return NextResponse.json(
      { message: "Не удалось загрузить список психологов" },
      { status: 500 }
    );
  }
}

