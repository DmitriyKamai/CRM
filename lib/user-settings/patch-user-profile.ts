/** PATCH /api/user/profile — общее тело для клиента и психолога (роль определяется на сервере). */
export async function patchUserProfile(body: object): Promise<void> {
  const res = await fetch("/api/user/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? "Не удалось сохранить");
  }
}
