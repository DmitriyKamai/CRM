import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PsychologistSettingsForm } from "@/components/psychologist/settings-form";

export default async function PsychologistSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/psychologist/settings");
  }

  if ((session.user as { role?: string }).role !== "PSYCHOLOGIST") {
    redirect("/");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-50">Настройки профиля</h1>
      <p className="text-sm text-slate-300">
        Личные данные, привязка аккаунтов и подписка на календарь.
      </p>
      <PsychologistSettingsForm />
    </div>
  );
}
