import { createEmpatixIconResponse } from "@/lib/empatix-icon-response";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return createEmpatixIconResponse(180);
}
