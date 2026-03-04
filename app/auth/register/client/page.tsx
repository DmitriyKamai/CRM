import { RegisterForm } from "@/components/auth/register-form";

export default function ClientRegisterPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <RegisterForm role="client" />
    </div>
  );
}

