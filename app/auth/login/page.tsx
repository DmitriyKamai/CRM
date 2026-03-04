import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Suspense fallback={<div className="text-muted-foreground">Загрузка...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

