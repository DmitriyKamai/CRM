import { permanentRedirect } from "next/navigation";

/** Старый URL каталога — редирект на канонический `/catalog`. */
export default function LegacyClientPsychologistsCatalogRedirect() {
  permanentRedirect("/catalog");
}
