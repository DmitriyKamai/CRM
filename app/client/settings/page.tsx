import { permanentRedirect } from "next/navigation";

/** Канонический URL настроек — `/settings`. */
export default function ClientSettingsRedirectPage() {
  permanentRedirect("/settings");
}
