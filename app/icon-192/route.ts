import { createEmpatixIconResponse } from "@/lib/empatix-icon-response";

export async function GET() {
  return createEmpatixIconResponse(192);
}
