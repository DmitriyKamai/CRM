import { RegisterForm } from "@/components/auth/register-form";

export default function PsychologistRegisterPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <RegisterForm role="psychologist" />
    </div>
  );
}

