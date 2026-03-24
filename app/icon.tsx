import { createEmpatixIconResponse } from "@/lib/empatix-icon-response";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  return createEmpatixIconResponse(32);
}
