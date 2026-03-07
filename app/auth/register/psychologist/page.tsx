import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";

export default function PsychologistRegisterPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Загрузка…</div>}>
        <RegisterForm role="psychologist" />
      </Suspense>
    </div>
  );
}

