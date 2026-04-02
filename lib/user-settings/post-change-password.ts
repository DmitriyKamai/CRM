export type ChangePasswordBody = {
  currentPassword: string;
  newPassword: string;
};

export async function postChangePassword(body: ChangePasswordBody): Promise<void> {
  const res = await fetch("/api/user/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? "Не удалось сменить пароль");
  }
}
