# Код ревью — Psychologist CRM

**Стек**: Next.js 14 (App Router) · TypeScript · Prisma + PostgreSQL · NextAuth · Telegram Bot API · Google Sheets API · Nodemailer

## Статус замечаний (последнее обновление документа)

| № | Тема | Статус |
|---|------|--------|
| 1 | Лишние запросы после транзакции в `appointments` | Исправлено: `telegramChatId` и имя клиента внутри транзакции |
| 2 | `INITIAL_ADMIN_EMAIL` / лишние UPDATE | Исправлено: ветка `else if (isInitialAdmin)` и один UPDATE до повышения до ADMIN |
| 3 | Rate limit без Redis в production | Исправлено: `console.warn` при старте в production |
| 4 | Касты в session callback | Исправлено: `types/next-auth.d.ts` |
| 5 | Дублирование env в OAuth | Исправлено: `oauthEnvConfig` в `lib/auth.ts` |
| 6 | Transporter в `email.ts` | Задокументировано комментарием у модуля |
| 7 | `profilePublished` vs БД | Исправлено: поле `profilePhotoPublished` в Prisma и коде |
| 8 | `ClientProfile.psychologistId` nullable | Задокументировано в схеме (поток social-complete) |
| 9 | Retry Telegram | Исправлено: `fetchWithRetry` в `lib/telegram.ts` |
| 10 | Refresh token Google Sheets в plaintext | Исправлено: опциональное AES-256-GCM при `GOOGLE_SHEETS_TOKEN_ENCRYPTION_KEY` |
| 11 | Широкий `connect-src` в CSP | Исправлено: узкий список в `proxy.ts` (Report-Only) |
| 12 | `header-nav-old.tsx` | Удалён |
| — | Тесты | Добавлены Vitest (`__tests__/`, см. AGENTS.md) |

Ниже — **исходный текст ревью** (исторический), строки со ссылками на файлы могли устареть.

---

## ✅ Что сделано хорошо

- **Многоуровневый rate limiting** ([lib/rate-limit.ts](file:///d:/CRM/lib/rate-limit.ts)) — Upstash Redis → node-redis → in-memory fallback. Грамотный паттерн для serverless.
- **Типизированные API-гарды** ([lib/security/api-guards.ts](file:///d:/CRM/lib/security/api-guards.ts)) — [requirePsychologist()](file:///d:/CRM/lib/security/api-guards.ts#81-120), [requireAdmin()](file:///d:/CRM/lib/security/api-guards.ts#121-128), [requireClientOrPsychologist()](file:///d:/CRM/lib/security/api-guards.ts#136-146) убирают дублирование проверок ролей.
- **JWT-стратегия с lazy-refresh из БД** — `trigger === "update" || (!token.role && token.id)` избегает запроса к БД на каждый запрос.
- **noopAdapter** для Credentials-only режима — корректно исключает обращения к таблицам Account/Session, если OAuth не настроен.
- **Security headers** в [proxy.ts](file:///d:/CRM/proxy.ts) — HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy, CSP Report-Only.
- **timingSafeEqual** в [verifyGoogleSheetsOAuthState](file:///d:/CRM/lib/google-sheets.ts#69-103) для защиты от timing-атак.
- **Оптимистичная обработка P2002** при создании `ClientProfile` — race condition обработан через поиск существующей записи.
- **[safeLogAudit](file:///d:/CRM/lib/audit-log.ts#15-37)** — best-effort логирование не прерывает основной бизнес-сценарий.

---

## 🔴 Критические проблемы

### 1. Telegram-уведомление внутри транзакции (потенциально)
**Файл**: [app/api/appointments/route.ts](file:///d:/CRM/app/api/appointments/route.ts#L134-L157)

Внутри `$transaction` вызывается `tx.psychologistProfile.findUnique` и `tx.clientProfile.findUnique` — это нормально. Но `notification.create` тоже внутри транзакции. Если транзакция откатится **после** создания уведомления (невозможно в Prisma, т.к. уведомление тоже в транзакции) — это ОК. Однако реальная проблема в другом:

**После транзакции** делается ещё 2 запроса в БД (строки 163–181) для получения `telegramChatId`, которые уже были доступны в транзакции. Это **лишние 2 запроса** к БД на каждую запись.

```diff
- // После транзакции: отдельные запросы к БД
- const [psychUser, client] = await Promise.all([
-   prisma.psychologistProfile.findUnique(...).then(p => prisma.user.findUnique(...)),
-   prisma.clientProfile.findUnique(...)
- ])

+ // Добавить в SELECT внутри транзакции:
+ const psychologist = await tx.psychologistProfile.findUnique({
+   where: { id: slot.psychologistId },
+   select: { userId: true, user: { select: { telegramChatId: true } } }
+ });
```

### 2. INITIAL_ADMIN_EMAIL проверяется при каждом обновлении токена
**Файл**: [lib/auth.ts](file:///d:/CRM/lib/auth.ts#L193-L197)

На каждый `trigger === "update"` или первый вход без роли — выполняется `prisma.user.update()` если email совпадает. При большой нагрузке это приводит к ненужным `UPDATE` запросам.

```diff
- if (isInitialAdmin && dbUser.role !== "ADMIN") {
-   await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
-   token.role = "ADMIN";
- }
+ // Роль уже есть — не делаем UPDATE
+ if (isInitialAdmin && dbUser.role !== "ADMIN") {
+   await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
+   token.role = "ADMIN";
+ } else if (isInitialAdmin) {
+   token.role = "ADMIN"; // уже ADMIN — просто берём из БД
+ }
```
> [!NOTE]
> Это уже так и работает (`token.role = dbUser.role` в else-ветке), но `UPDATE` происходит каждый раз пока роль ≠ ADMIN. Если INITIAL_ADMIN_EMAIL совпадает с пользователем с ролью PSYCHOLOGIST — будет постоянный UPDATE при каждом обновлении токена.

### 3. [rate-limit.ts](file:///d:/CRM/lib/rate-limit.ts): in-memory store не работает в multi-instance деплое
**Файл**: [lib/rate-limit.ts](file:///d:/CRM/lib/rate-limit.ts)

Это задокументировано в комментарии, но важно подчеркнуть: в production на Vercel или любом multi-replica деплое без Redis in-memory fallback не даёт никакой защиты — каждый инстанс имеет свой Map.

> [!CAUTION]
> Если `UPSTASH_REDIS_REST_URL` и `REDIS_URL` не настроены в production, rate limiting не работает между инстансами. Рекомендуется добавить warning-лог при старте в production.

```typescript
// lib/rate-limit.ts — добавить при инициализации:
if (process.env.NODE_ENV === "production" && !process.env.UPSTASH_REDIS_REST_URL && !process.env.REDIS_URL) {
  console.warn("[rate-limit] ПРЕДУПРЕЖДЕНИЕ: Redis не настроен. Rate limiting работает только в рамках одного инстанса.");
}
```

---

## 🟡 Важные замечания

### 4. `as unknown as` cast в session callback — хрупкая типизация
**Файл**: [lib/auth.ts](file:///d:/CRM/lib/auth.ts#L227-L232)

```typescript
(session.user as unknown as { id?: string }).id = tok.id;
(session.user as unknown as { role?: string }).role = tok.role;
```

Это стандартный обходной путь для NextAuth v4, но лучше использовать module augmentation:

```typescript
// types/next-auth.d.ts
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string | null;
    } & DefaultSession["user"];
  }
}
```

### 5. [buildProviders()](file:///d:/CRM/lib/auth.ts#62-133) и [hasOAuthProviders()](file:///d:/CRM/lib/auth.ts#134-144) дублируют чтение env
**Файл**: [lib/auth.ts](file:///d:/CRM/lib/auth.ts#L106-L143)

Переменные окружения для Google/Apple читаются дважды — в [buildProviders()](file:///d:/CRM/lib/auth.ts#62-133) и [hasOAuthProviders()](file:///d:/CRM/lib/auth.ts#134-144). При вызове `authOptions` оба вызываются при инициализации модуля.

```typescript
// Рефактор: вычислить один раз
const oauthConfig = (() => {
  const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  // ...
  return { google: googleId && googleSecret ? { id: googleId, secret: googleSecret } : null, apple: ... };
})();
```

### 6. [email.ts](file:///d:/CRM/lib/email.ts): transporter создаётся на уровне модуля
**Файл**: [lib/email.ts](file:///d:/CRM/lib/email.ts#L15-L26)

Если `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` изменились (ротация credentials), нужен перезапуск. В serverless это не проблема, но стоит задокументировать.

### 7. `PsychologistProfile.profilePublished` — имя поля vs `@map`
**Файл**: [prisma/schema.prisma](file:///d:/CRM/prisma/schema.prisma#L197)

```prisma
profilePublished Boolean @default(false) @map("profilePhotoPublished")
```

Поле в коде называется `profilePublished`, а в БД `profilePhotoPublished`. Это потенциально запутывает при миграциях и отладке — рекомендуется привести к единообразию.

### 8. `ClientProfile.psychologistId` — nullable, но semantically required
**Файл**: [prisma/schema.prisma](file:///d:/CRM/prisma/schema.prisma#L258)

```prisma
psychologistId String?
```

Поле опционально из-за `@@unique([psychologistId, email])` (unique constraint с nullable), но по сути каждый клиент должен принадлежать психологу. Это создаёт риск "orphan" записей. Если бизнес-логика требует обязательной связи, стоит добавить в приложении validation.

---

## 🟢 Незначительные улучшения

### 9. Telegram: нет retry при ошибке сети
**Файл**: [lib/telegram.ts](file:///d:/CRM/lib/telegram.ts)

[fetchWithTimeout](file:///d:/CRM/lib/telegram.ts#19-22) с 8 секундами — хорошо, но при временных сбоях Telegram API (5xx) сообщение теряется без retry. Для критичных уведомлений (новая запись) стоит рассмотреть простой exponential backoff или очередь.

### 10. [google-sheets.ts](file:///d:/CRM/lib/google-sheets.ts): OAuth токен хранится в plaintext
**Файл**: [prisma/schema.prisma](file:///d:/CRM/prisma/schema.prisma#L200)

`googleSheetsRefreshToken String? @db.Text` — хранится в открытом виде в БД. Рекомендуется шифрование at-rest (через database encryption или поле-уровень шифрование) если это требование compliance.

### 11. [proxy.ts](file:///d:/CRM/proxy.ts): CSP `connect-src` слишком широкий
**Файл**: [proxy.ts](file:///d:/CRM/proxy.ts#L41)

```
"connect-src 'self' https: wss: http: ws:"
```

Это фактически разрешает подключение к любому хосту. В режиме Report-Only не критично, но при переводе в Enforce нужно конкретизировать (Telegram API, Google APIs, etc.).

### 12. [header-nav-old.tsx](file:///d:/CRM/components/header-nav-old.tsx) — мёртвый код
**Файл**: [components/header-nav-old.tsx](file:///d:/CRM/components/header-nav-old.tsx)

Файл размером 11.7 KB с суффиксом `-old` — подлежит удалению или архивированию.

---

## 📊 Итоговая оценка

| Категория | Оценка |
|-----------|--------|
| Безопасность | ⭐⭐⭐⭐☆ |
| Архитектура | ⭐⭐⭐⭐☆ |
| Типизация | ⭐⭐⭐☆☆ |
| Производительность | ⭐⭐⭐☆☆ |
| Тестируемость | ⭐⭐☆☆☆ |

**Общий вывод** (исторический): Код написан грамотно — хорошая структура, продуманная безопасность. По состоянию на обновление таблицы выше основные пункты закрыты; для production по-прежнему **настоятельно** рекомендуется Redis/Upstash для rate limit между инстансами.
