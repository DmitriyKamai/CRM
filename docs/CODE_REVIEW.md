# Код-ревью: Empatix CRM

Дата: 2026-03-25
Статус: ✅ Все найденные проблемы (кроме #4 — открытая регистрация психологов по решению владельца) исправлены.

Дополнительно: обзор замечаний по архитектуре, rate limit, CSP, Google Sheets, типам NextAuth и т.д. — в корневом [`code_review.md`](../code_review.md) (таблица статуса в начале файла).

## Критические проблемы

### 1. ~~IDOR при загрузке файлов клиента~~ ✅ ИСПРАВЛЕНО

**Файл:** `app/api/psychologist/clients/[id]/files/route.ts` (POST)
**Серьёзность:** 🔴 CRITICAL

Добавлена проверка `findFirst({ where: { id, psychologistId } })` перед загрузкой.

---

## Высокий приоритет

### 2. ~~Публичный GET-эндпоинт мутирует БД~~ ✅ ИСПРАВЛЕНО

**Файл:** `app/api/schedule/psychologists/[id]/slots/route.ts`
**Серьёзность:** 🟠 HIGH

Удалена мутация `appointment.updateMany` из GET-эндпоинта.

### 3. ~~Shmishek submit не проверяет тип теста~~ ✅ ИСПРАВЛЕНО

**Файл:** `app/api/diagnostics/shmishek/submit/route.ts`
**Серьёзность:** 🟠 HIGH

Добавлена проверка `link.test.type !== "SHMISHEK"`.

### 4. Открытая регистрация психологов — ⏭️ НЕ БАГО, ПО ЗАМЫСЛУ

**Файл:** `app/api/auth/register/route.ts`
**Серьёзность:** ℹ️ INFO

Открытая регистрация психологов — осознанное решение владельца продукта.

### 5. ~~Нет защиты от удаления последнего админа~~ ✅ ИСПРАВЛЕНО

**Файл:** `app/api/admin/users/[id]/role/route.ts`
**Серьёзность:** 🟠 HIGH

Добавлена проверка `count({ where: { role: "ADMIN" } }) > 1` перед понижением.

---

## Средний приоритет

### 6. ~~`proxy.ts` не подключён как middleware~~ ✅ ИСПРАВЛЕНО

**Файл:** `proxy.ts`
**Серьёзность:** 🟡 MEDIUM

В Next.js 16 `proxy.ts` подхватывается автоматически — подтверждено сборкой (`ƒ Proxy (Middleware)`) и проверкой заголовков.

### 7. ~~Diagnostic progress PATCH слабее GET~~ ✅ ИСПРАВЛЕНО

**Файл:** `app/api/diagnostics/progress/route.ts`
**Серьёзность:** 🟡 MEDIUM

PATCH теперь включает `test: { select: { isActive: true } }` и проверяет `test.isActive`.

### 8. ~~Утечка ошибки БД клиенту~~ ✅ ИСПРАВЛЕНО

**Файл:** `app/api/client/dashboard/route.ts`
**Серьёзность:** 🟡 MEDIUM

Заменён `dbErr.message` на generic-сообщение в обоих catch-блоках.

### 9. ~~Forgot-password: abuse per-email rate limit~~ ✅ ИСПРАВЛЕНО

**Файл:** `app/api/auth/forgot-password/route.ts`
**Серьёзность:** 🟡 MEDIUM

Per-email rate limit теперь срабатывает только после подтверждения существования пользователя.

### 10. ~~СМИЛ: ключи ответов не проверяются на целочисленность~~ ✅ ИСПРАВЛЕНО

**Файл:** `app/api/diagnostics/smil/submit/route.ts`
**Серьёзность:** 🟡 MEDIUM

Заменено `Number.isFinite` на `Number.isInteger`.

### 11. ~~`appointments/[id]` — status без enum-валидации~~ ✅ ИСПРАВЛЕНО

**Файл:** `app/api/appointments/[id]/route.ts`
**Серьёзность:** 🟡 MEDIUM

Добавлена проверка через `VALID_STATUSES.includes()` перед использованием.

---

## Низкий приоритет

### 12. ~~Forgot-password: resetUrl в ответе (non-production)~~ ✅ ИСПРАВЛЕНО

**Файл:** `app/api/auth/forgot-password/route.ts`
**Серьёзность:** 🟢 LOW

Удалён возврат `resetUrl` в JSON-ответе.

### 13. ~~Diagnostic links: fallback на Math.random~~ ✅ ИСПРАВЛЕНО

**Файлы:** `diagnostics/*/link/route.ts`
**Серьёзность:** 🟢 LOW

Убран fallback на `Math.random` — теперь всегда `crypto.randomUUID()`.

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
