# Код-ревью: Empatix CRM

Дата: 2026-03-25

## Критические проблемы

### 1. IDOR при загрузке файлов клиента

**Файл:** `app/api/psychologist/clients/[id]/files/route.ts` (POST)
**Серьёзность:** 🔴 CRITICAL

Психолог может загрузить файл к чужому клиенту — после `requirePsychologist()` не проверяется, что `ClientProfile` принадлежит текущему психологу. DELETE корректно фильтрует по всем полям, а POST — нет.

**Исправление:** Добавить `findFirst({ where: { id, psychologistId: ctx.psychologistId } })` перед созданием записи — аналогично `invite/route.ts`.

---

## Высокий приоритет

### 2. Публичный GET-эндпоинт мутирует БД

**Файл:** `app/api/schedule/psychologists/[id]/slots/route.ts`
**Серьёзность:** 🟠 HIGH

GET-запрос (список слотов психолога) выполняет `appointment.updateMany`, очищая `slotId` у записей. Побочные эффекты на публичном read-only эндпоинте — риск DoS и нарушения данных.

**Исправление:** Перенести reconciliation-логику в отдельный cron/admin-эндпоинт или authenticated PUT/POST.

### 3. Shmishek submit не проверяет тип теста

**Файл:** `app/api/diagnostics/shmishek/submit/route.ts`
**Серьёзность:** 🟠 HIGH

Павлова и СМИЛ проверяют `link.test.type`, а Шмишек — только `isActive`. Токен от другого теста можно отправить на `/api/diagnostics/shmishek/submit`, создав `TestResult` с неправильной интерпретацией.

**Исправление:** Добавить `if (link.test.type !== "SHMISHEK") return 400`.

### 4. Открытая регистрация психологов

**Файл:** `app/api/auth/register/route.ts`
**Серьёзность:** 🟠 HIGH (если не задумано)

Любой может зарегистрироваться как психолог без верификации. Для CRM это может быть нежелательно.

**Исправление:** Добавить инвайт-систему или модерацию для роли `PSYCHOLOGIST`.

### 5. Нет защиты от удаления последнего админа

**Файл:** `app/api/admin/users/[id]/role/route.ts`
**Серьёзность:** 🟠 HIGH

Админ может понизить себя или последнего админа, заблокировав доступ к админке навсегда.

**Исправление:** Проверять `count({ where: { role: "ADMIN" } }) > 1` перед понижением.

---

## Средний приоритет

### 6. `proxy.ts` не подключён как middleware

**Файл:** `proxy.ts`
**Серьёзность:** 🟡 MEDIUM

Файл определяет CSP-заголовки, HSTS, Permissions-Policy, но не экспортируется как Next.js middleware (`middleware.ts` отсутствует). Заголовки из `proxy.ts` не применяются.

**Исправление:** Создать `middleware.ts`, реэкспортирующий `proxy`, или перенести заголовки в `next.config.mjs`.

### 7. Diagnostic progress PATCH слабее GET

**Файл:** `app/api/diagnostics/progress/route.ts`
**Серьёзность:** 🟡 MEDIUM

GET проверяет `test.isActive`, expiry и maxUses. PATCH — нет. Можно обновить прогресс по деактивированному тесту.

**Исправление:** Повторить валидацию из GET в PATCH.

### 8. Утечка ошибки БД клиенту

**Файл:** `app/api/client/dashboard/route.ts`
**Серьёзность:** 🟡 MEDIUM

`dbErr.message` может содержать информацию о схеме или подключении. Возвращается напрямую клиенту.

**Исправление:** Логировать на сервере, возвращать generic-сообщение.

### 9. Forgot-password: abuse per-email rate limit

**Файл:** `app/api/auth/forgot-password/route.ts`
**Серьёзность:** 🟡 MEDIUM

Rate limit по email срабатывает до проверки существования пользователя. Атакующий может исчерпать лимит жертвы (3/час).

**Исправление:** Строже лимитировать по IP; инкрементировать per-email счётчик только для существующих аккаунтов.

### 10. СМИЛ: ключи ответов не проверяются на целочисленность

**Файл:** `app/api/diagnostics/smil/submit/route.ts`
**Серьёзность:** 🟡 MEDIUM

`Number.isFinite` пропускает дробные числа (`"1.5"`), которые некорректны как индексы вопросов.

**Исправление:** Использовать `Number.isInteger(index)`.

### 11. `appointments/[id]` — status без enum-валидации

**Файл:** `app/api/appointments/[id]/route.ts`
**Серьёзность:** 🟡 MEDIUM

`body?.status as AppointmentStatus` — cast без проверки. Невалидная строка попадёт в Prisma.

**Исправление:** Валидировать через `z.enum([...])` или allowlist.

---

## Низкий приоритет

### 12. Forgot-password: resetUrl в ответе (non-production)

**Файл:** `app/api/auth/forgot-password/route.ts`
**Серьёзность:** 🟢 LOW

В `NODE_ENV !== "production"` ссылка сброса пароля возвращается в JSON. На shared dev/staging — утечка.

### 13. Diagnostic links: fallback на Math.random

**Файлы:** `diagnostics/*/link/route.ts`
**Серьёзность:** 🟢 LOW

`randomToken()` использует `Math.random()` если нет `crypto.randomUUID`. На Node 22 это не проблема, но fallback лучше удалить.

### 14. `dangerouslySetInnerHTML` в chart.tsx

**Файл:** `components/ui/chart.tsx`
**Серьёзность:** 🟢 LOW

Используется для CSS-переменных из конфига. Безопасно пока конфиг не формируется из пользовательского ввода.

---

## Архитектурные наблюдения

| Аспект | Оценка | Комментарий |
|--------|--------|-------------|
| Централизация auth | ✅ Хорошо | `lib/security/api-guards.ts` — единые guard-функции |
| Транзакции | ✅ Хорошо | `$transaction` + lock-паттерны в appointments и diagnostics |
| SQL-инъекции | ✅ Хорошо | Prisma + tagged templates в audit-log |
| Password hashing | ✅ Хорошо | `bcryptjs` cost=10, консистентно |
| Дублирование кода | ⚠️ Можно улучшить | Логика diagnostic link (expiry, maxUses, type check) дублируется в 6+ файлах → вынести `assertDiagnosticLinkUsable()` |
| Middleware | ⚠️ Отсутствует | `proxy.ts` не подключён; нет глобального auth/rate-limit middleware |
| Толстые handlers | ⚠️ Можно улучшить | Крупные роуты смешивают HTTP, валидацию, Prisma, нотификации. Рекомендуется service-слой. |
