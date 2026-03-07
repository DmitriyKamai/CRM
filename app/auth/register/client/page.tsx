import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";

export default function ClientRegisterPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Загрузка…</div>}>
        <RegisterForm role="client" />
      </Suspense>
    </div>
  );
}

