import { NextRequest, NextResponse } from "next/server";
import { BELARUS_CITIES_RU, RUSSIAN_CITIES_RU } from "@/lib/data/cities-ru";

/**
 * Подсказки городов только для России и Беларуси.
 * Для остальных стран возвращаем пустой список — пользователь вводит город вручную.
 */
export async function GET(req: NextRequest) {
  const countryCode = req.nextUrl.searchParams.get("country");

  if (!countryCode) {
    return NextResponse.json({ cities: [] });
  }

  if (countryCode === "RU") {
    return NextResponse.json({ cities: RUSSIAN_CITIES_RU });
  }
  if (countryCode === "BY") {
    return NextResponse.json({ cities: BELARUS_CITIES_RU });
  }

  return NextResponse.json({ cities: [] });
}
