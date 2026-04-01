import { permanentRedirect } from "next/navigation";

/** Канонический URL настроек — `/settings`. */
export default function PsychologistSettingsRedirectPage() {
  permanentRedirect("/settings");
}
