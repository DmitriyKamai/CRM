# AGENTS.md

## General rules

- **Все ответы агента должны быть только на русском языке.** Комментарии в коде, сообщения коммитов, описания PR и любое общение с пользователем — всё на русском.
- **Git:** после **`git commit`** выполняй **`git push`** в удалённый репозиторий (обычно `origin` и актуальная ветка), если пользователь явно не просил не пушить. Локальный коммит без push не считается завершением задачи для CI/деплоя.

---

## Cursor Cloud specific instructions

### Обзор продукта

**Empatix** — CRM для психологов и их клиентов. Next.js 16 (App Router), TypeScript, Prisma ORM, PostgreSQL. Весь интерфейс на русском языке.

Три роли: `PSYCHOLOGIST`, `CLIENT`, `ADMIN`. Первый администратор назначается через `INITIAL_ADMIN_EMAIL` в `.env`.

### Сервисы

| Сервис | Обязателен | Запуск / примечание |
|--------|-----------|--------|
| PostgreSQL | Да | Облако (Neon и т.п.) по `DATABASE_URL` или локально — см. документацию СУБД. Команда `sudo pg_ctlcluster 16 main start` — **только пример** для Debian/Ubuntu с пакетом PostgreSQL 16 |
| Next.js | Да | см. «Режимы запуска» |
| Redis / Upstash | Нет (dev) / **настоятельно рекомендуется (prod)** | Без Redis — in-memory лимитер только в рамках одного инстанса; для Vercel и нескольких реплик задайте `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` или `REDIS_URL` |
| Telegram бот | Нет | `npm run bot` (нужен `TELEGRAM_BOT_TOKEN`) |
| SMTP | Нет | Без SMTP — email логируются в консоль |
| Vercel Blob | Нет | Без `BLOB_READ_WRITE_TOKEN` — загрузка файлов отключена |

### Режимы запуска

| Команда | Что делает | Когда использовать |
|---------|-----------|-------------------|
| `npm run dev:turbopack` | Next dev + Turbopack HMR | Быстрая итерация. ⚠️ Страница `/psychologist/settings` может крашить процесс |
| `npm run dev:no` | Next dev + Webpack HMR | Стабильнее Turbopack |
| `npm run dev` / `dev:stable` | `next build && next start` | Когда нужен стабильный сервер (НЕ hot-reload!) |
| `npm run build:next` | Только production-сборка | Проверка сборки |
| `npm run start` | Запуск собранного приложения | После `build:next` |

⚠️ **`npm run dev` — это НЕ dev-сервер с hot-reload.** Это `next build && next start`. Для HMR используй `dev:turbopack` или `dev:no`.

### Проверки качества кода

```
npm run lint          # ESLint, --max-warnings=0
npm run typecheck     # tsc --noEmit
npm run test          # Vitest (юнит-тесты в `__tests__/`)
npm run test:watch    # Vitest в watch-режиме
npm run security:audit # npm audit production-зависимостей
npm run security:check # typecheck + lint + security:audit
npm run build:next    # production-сборка (на части сред может прерываться; минимум — lint + typecheck + test)
```

### База данных

- **Схема:** `prisma/schema.prisma`
- **Свежая БД:** `npx prisma migrate deploy` или `npx prisma db push`
- **Seed диагностик:** `npm run prisma:seed` (Шмишек + Павлова + СМИЛ)
- **Обязательные `.env`:** `DATABASE_URL`, `DIRECT_DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- **Локально `prisma migrate dev`:** в схеме задан `shadowDatabaseUrl` — нужен `SHADOW_DATABASE_URL` (отдельная БД или схема; см. `DEPLOY.md` / документацию Prisma)
- **Миграции в репозитории:** baseline — одна миграция `20260325180000_init` (см. `prisma/MIGRATIONS.md`); дальше — `prisma migrate dev`.
- **`npm run build`** автоматически запускает `prisma generate` + `migrate-deploy` + `next build`.

---

## Архитектура проекта

### Структура директорий

```
app/                          # Next.js App Router
├── page.tsx                  # Лендинг (/)
├── auth/                     # Авторизация: login, register, forgot/reset-password
├── psychologist/             # Кабинет психолога: клиенты, расписание, диагностика, настройки
├── client/                   # Кабинет клиента: дашборд, список психологов, запись
├── admin/                    # Админка: пользователи, роли, аудит-лог, модули
├── diagnostics/[token]/      # Публичная страница прохождения теста по токену
└── api/                      # API-роуты (см. ниже)

lib/                          # Серверная бизнес-логика
├── auth.ts                   # NextAuth: providers, callbacks, JWT (oauthEnvConfig)
├── db.ts                     # Prisma-клиент (singleton)
├── rate-limit.ts             # Rate limiter: Upstash → Redis → in-memory (+ warn в prod без Redis)
├── google-sheets-refresh-token-crypto.ts  # AES-256-GCM для refresh token Google Sheets (опционально)
├── api-error.ts              # Стандартизированная обработка ошибок API
├── audit-log.ts              # Аудит-лог (best-effort запись)
├── client-history.ts         # Лента истории действий по клиенту
├── platform-modules.ts       # Feature flags: scheduling, diagnostics
├── email.ts                  # SMTP (fallback — лог в консоль)
├── telegram.ts               # Telegram-уведомления
├── security/
│   └── api-guards.ts         # Auth guards: requireAuth, requirePsychologist, requireAdmin, etc.
└── diagnostics/
    ├── shmishek.ts           # Расчёт и интерпретация Шмишека (88 вопросов, бинарный)
    ├── pavlova.ts            # Расчёт и интерпретация Павлова (88 вопросов, 3-балльный)
    ├── smil.ts               # Расчёт СМИЛ (566 вопросов, K-коррекция, T-баллы)
    ├── smil-questions.ts     # Загрузка вопросов СМИЛ из JSON
    ├── link-validation.ts    # Общая валидация diagnostic link (isActive, expiry, maxUses, type)
    ├── submit-result.ts      # Общая логика сохранения результата теста
    ├── create-link.ts        # Общая логика создания diagnostic link
    └── token.ts              # crypto.randomUUID()

components/                   # React-компоненты
├── ui/                       # shadcn/ui компоненты (Radix UI)
├── psychologist/             # Компоненты кабинета психолога
├── client/                   # Компоненты кабинета клиента
├── admin/                    # Компоненты админки
├── diagnostics/              # Формы тестов (ShmishekTestForm, PavlovaTestForm, SmilTestForm)
└── auth/                     # Формы входа/регистрации

prisma/
├── schema.prisma             # Схема БД (все модели)
├── migrations/               # История миграций (baseline: init)
├── seed-shmishek.ts          # Seed: вопросы и шкалы Шмишека
├── seed-pavlova.ts           # Seed: вопросы и шкалы Павлова
└── seed-smil.ts              # Seed: вопросы и шкалы СМИЛ

__tests__/                    # Vitest юнит-тесты
├── diagnostics/              # Тесты на расчёт диагностик
└── lib/                      # rate-limit, валидация, crypto Google Sheets

types/
└── next-auth.d.ts            # Расширение типов Session / JWT / User
```

### API-роуты

#### Авторизация (`/api/auth/`)

| Роут | Метод | Описание |
|------|-------|----------|
| `[...nextauth]` | GET/POST | NextAuth handler (credentials, Google, Apple) |
| `register` | POST | Регистрация (role: psychologist/client) |
| `forgot-password` | POST | Запрос сброса пароля |
| `reset-password` | POST | Сброс пароля по токену |
| `oauth-link-intent` | POST | Привязка OAuth к существующему аккаунту |

#### Психолог (`/api/psychologist/`)

| Роут | Метод | Описание |
|------|-------|----------|
| `clients` | GET/POST/DELETE | Список/создание/массовое удаление клиентов |
| `clients/[id]` | GET/PATCH/DELETE | CRUD отдельного клиента |
| `clients/[id]/appointments` | GET/POST | Записи клиента |
| `clients/[id]/diagnostics` | GET | Результаты диагностик клиента |
| `clients/[id]/files` | GET/POST | Файлы клиента |
| `clients/[id]/files/[fileId]` | DELETE | Удаление файла |
| `clients/[id]/custom-fields` | GET/PATCH | Пользовательские поля |
| `clients/[id]/invite` | POST | Приглашение клиента |
| `clients/[id]/history` | GET | Лента истории клиента |
| `clients/export` | GET | Экспорт клиентов (CSV) |
| `clients/import` | POST | Импорт клиентов |
| `custom-fields` | GET/POST/DELETE/PATCH | Определения полей |
| `client-statuses` | GET/POST/PATCH/DELETE | Статусы клиентов |
| `profile-photo` | POST/DELETE | Фото профиля |
| `google-sheets/*` | | Интеграция с Google Sheets |

#### Диагностика (`/api/diagnostics/`)

| Роут | Метод | Описание |
|------|-------|----------|
| `shmishek/link` | POST | Создание ссылки на тест Шмишека |
| `shmishek/submit` | POST | Отправка результатов Шмишека |
| `pavlova/link` | POST | Создание ссылки на тест Павлова |
| `pavlova/submit` | POST | Отправка результатов Павлова |
| `smil/link` | POST | Создание ссылки на тест СМИЛ |
| `smil/submit` | POST | Отправка результатов СМИЛ |
| `smil/questions` | GET | Вопросы СМИЛ (по варианту) |
| `progress` | GET/PATCH | Сохранение/загрузка прогресса прохождения |

#### Расписание (`/api/schedule/`, `/api/appointments/`)

| Роут | Метод | Описание |
|------|-------|----------|
| `schedule/slots` | GET/POST | Слоты психолога |
| `schedule/slots/[id]` | PATCH/DELETE | Управление слотом |
| `schedule/psychologists` | GET | Список психологов (публичный) |
| `schedule/psychologists/[id]/slots` | GET | Свободные слоты (публичный) |
| `appointments` | POST | Запись на приём |
| `appointments/[id]` | PATCH | Смена статуса записи |

#### Админка (`/api/admin/`)

| Роут | Метод | Описание |
|------|-------|----------|
| `users` | GET | Список пользователей |
| `users/[id]/role` | PATCH | Смена роли (с защитой последнего админа) |
| `audit-log` | GET | Аудит-лог с фильтрами |
| `tests` | GET | Список тестов |
| `tests/[id]` | PATCH | Вкл/выкл теста |
| `platform-modules` | GET/PATCH | Feature flags (scheduling, diagnostics) |

### Паттерны кода

#### State management (обязательно)

- Разделяйте состояние по ответственности:
  - **server state** (данные API, кэш, инвалидации, мутации) — через **TanStack Query**.
  - **client global state** (кросс-страничный UI/domain state) — через **Redux Toolkit**.
  - **локальный state формы/виджета** — через `useState` внутри компонента/таба.
- Не дублируйте одни и те же данные одновременно в Redux и Query-кэше.
- Для новых API-сценариев по умолчанию делайте custom hook в `hooks/` с `useQuery` / `useMutation`, а не `fetch` в `useEffect`.

Текущие Redux slices:
- `store/slices/ui.slice.ts`
- `store/slices/notifications.slice.ts`
- `store/slices/analytics.slice.ts`
- `store/slices/diagnostics-progress.slice.ts`

#### Query-first hooks (актуальные)

- Расписание:
  - `hooks/use-schedule-slots.ts`
  - `hooks/use-schedule-clients.ts`
- Клиенты:
  - `hooks/use-clients-data.ts`
- Настройки:
  - `hooks/use-profile-settings.ts`
  - `hooks/use-custom-fields-settings.ts`
  - `hooks/use-client-statuses-settings.ts`
- Диагностика:
  - `hooks/use-smil-questions.ts`
  - `hooks/use-smil-progress.ts`
  - `hooks/use-smil-submit.ts`
  - `hooks/use-diagnostic-progress.ts`
  - `hooks/use-diagnostic-submit.ts`

#### Auth guards (`lib/security/api-guards.ts`)

Все API-роуты используют guard-функции:
- `requireAuth()` — проверка сессии
- `requireRoles(["PSYCHOLOGIST"])` — проверка роли
- `requirePsychologist()` — роль + `psychologistProfile`
- `requireAdmin()` — роль ADMIN
- `requireClient()` — роль CLIENT
- `requireClientOrPsychologist()` — запись клиента на приём и схожие сценарии (роль CLIENT или PSYCHOLOGIST)

Пример:
```typescript
const ctx = await requirePsychologist();
if (!ctx.ok) return ctx.response;
// ctx.psychologistId, ctx.userId, ctx.session доступны
```

#### Feature flags (`lib/platform-modules.ts`)

Модули `scheduling` и `diagnostics` можно отключать через админку. В API используется:
```typescript
const mod = await assertModuleEnabled("diagnostics");
if (mod) return mod; // 403 если модуль отключён
```

#### Диагностика: общие модули (`lib/diagnostics/`)

Три теста (Шмишек, Павлова, СМИЛ) используют общие модули:
- `link-validation.ts` — `validateDiagnosticLink(token, expectedType?)` → проверка isActive, expiry, maxUses, type
- `submit-result.ts` — `saveTestResultAndIncrement(...)` → $transaction: создание результата + increment usedCount + удаление прогресса + history
- `create-link.ts` — `handleCreateDiagnosticLink(request, options)` — полный flow создания ссылки: профиль, клиент, токен, нотификация, аудит

#### Rate limiting (`lib/rate-limit.ts`)

Три стратегии (приоритет): Upstash Redis → стандартный Redis → in-memory Map. Для локальной разработки Redis не нужен. В **production** при отсутствии Redis в env процесс при старте пишет предупреждение в лог: лимит не сквозной между инстансами serverless.

#### Google Sheets OAuth (`GOOGLE_SHEETS_TOKEN_ENCRYPTION_KEY`)

Опционально: Base64 от **32 байт** (`openssl rand -base64 32`). Если задан — `googleSheetsRefreshToken` в БД хранится в формате `gs:v1:…` (AES-256-GCM). Без ключа значение хранится как раньше (удобно для dev). **Не отключайте ключ на проде**, если в БД уже есть зашифрованные токены — пользователям потребуется переподключить Google.

#### Обработка ошибок

`lib/api-error.ts` содержит `handleApiError(error, context)` — ZodError → 400, остальное → 500 с логированием.

### Последние архитектурные изменения (важно)

1. `components/schedule/psychologist-schedule.tsx` декомпозирован:
   - вынесены `components/schedule/create-appointment-dialog.tsx` и `components/schedule/slot-detail-popover.tsx`;
   - вынесены утилиты в `lib/schedule-utils.ts`;
   - сетевые операции перенесены в query-hooks.
2. `components/psychologist/clients-list.tsx` декомпозирован до оркестратора:
   - загрузка клиентов/статусов/кастомных полей/порядка колонок — `hooks/use-clients-data.ts`;
   - импорт клиентов — `hooks/use-clients-import.ts` + `components/psychologist/clients-import-dialog.tsx`;
   - экспорт клиентов — `hooks/use-clients-export.ts`;
   - масштабирование списка — `hooks/use-clients-list-scale.ts` + `components/psychologist/clients-list-scale-shell.tsx`;
   - конфигурация колонок таблицы — `hooks/use-clients-table-columns.tsx`;
   - основной UI-блок списка вынесен в `components/psychologist/clients-list-main-content.tsx`;
   - профиль клиента в overlay — `components/psychologist/clients-profile-overlay.tsx`;
   - диалог создания клиента — `components/psychologist/clients-create-dialog.tsx`;
3. `components/psychologist/settings-form.tsx` частично декомпозирован:
   - загрузка профиля и аккаунтов перенесена в `hooks/use-profile-settings.ts`;
   - загрузка custom fields/statuses перенесена в `hooks/use-custom-fields-settings.ts` и `hooks/use-client-statuses-settings.ts`.

### Правила для дальнейшего рефакторинга

- Крупные экраны дробить в порядке:
  1) hooks (данные и бизнес-логика),
  2) подкомпоненты (UI-блоки),
  3) утилиты (`lib/*`).
- Придерживайтесь `single responsibility` на всех уровнях:
  - **компонент** отвечает за один UI-сценарий;
  - **hook** отвечает за один источник/тип данных или один workflow;
  - **утилита** решает одну вычислительную задачу без UI-побочек.
- Оркестратор страницы/экрана не должен содержать массивную JSX-разметку и сетевую логику одновременно: orchestration в контейнере, реализация — в дочерних блоках и hooks.
- Новые части UI по умолчанию проектируйте как независимые блоки с явными входами/выходами (props/callbacks), чтобы их можно было переиспользовать и тестировать изолированно.
- Перед добавлением нового `useEffect` с `fetch` проверьте, можно ли выразить сценарий через Query hook.
- Для мутаций всегда определяйте стратегию:
  - оптимистичное обновление (`setQueryData`) и/или
  - `invalidateQueries` после успешного действия.

### Тесты

- **Фреймворк:** Vitest
- **Конфиг:** `vitest.config.ts` (alias `@/`, environment: node)
- Тесты в `__tests__/`:
  - `diagnostics/shmishek.test.ts` — расчёт баллов, обратные ключи, интерпретация
  - `diagnostics/pavlova.test.ts` — 3-балльная шкала, обратные ключи
  - `diagnostics/smil.test.ts` — сырые баллы, K-коррекция, T-баллы, мужской/женский ключ
  - `lib/rate-limit.test.ts` — in-memory лимитер
  - `lib/validation.test.ts` — схема регистрации
  - `lib/google-sheets-refresh-token-crypto.test.ts` — шифрование refresh token Google Sheets

### Security headers

`proxy.ts` — Next.js 16 Proxy (аналог middleware). Устанавливает:
- `Content-Security-Policy-Report-Only` (в т.ч. узкий `connect-src`: свой домен, Telegram API, Google, Vercel Blob, Upstash и т.д.; при новых интеграциях в браузере — расширять список)
- `Permissions-Policy`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (только production)

### Модели БД (основные)

| Модель | Описание |
|--------|----------|
| `User` | Пользователь + роль (CLIENT/PSYCHOLOGIST/ADMIN) |
| `PsychologistProfile` | Профиль психолога (`profilePhotoPublished` — показ карточки в каталоге) |
| `ClientProfile` | Профиль клиента (может быть без userId — «офлайн-клиент») |
| `Test` / `TestQuestion` / `TestScale` | Диагностические тесты |
| `TestResult` | Результат прохождения теста |
| `DiagnosticLink` / `DiagnosticProgress` | Ссылки на тесты и прогресс прохождения |
| `ScheduleSlot` / `Appointment` | Расписание и записи на приём |
| `CustomFieldDefinition` / `CustomFieldValue` | Пользовательские поля |
| `Recommendation` | Рекомендации психолога клиенту |
| `AuditLog` | Аудит-лог действий |
| `ClientHistoryEvent` | Лента истории по клиенту |
| `Notification` | Уведомления |
| `CalendarFeedToken` | Токены подписки на ICS-календарь |
| `PlatformSettings` | Feature flags (scheduling, diagnostics) |

### Неочевидные особенности

1. **`npm run build`** выполняет `prisma generate` + `migrate-deploy` + `next build` — для деплоя, не для разработки.
2. **`postinstall`** патчит Next.js dev-сервер (`scripts/patch-next-dev.js`) для auto-restart при V8 crash (Windows).
3. **`proxy.ts`** — это Next.js 16 Proxy, заменивший `middleware.ts`. Нельзя создавать `middleware.ts` — билд упадёт.
4. **ClientProfile без userId** — психолог может создать клиента без аккаунта (офлайн-клиент). При регистрации клиента происходит привязка по email.
5. **Rate limit** без Redis: in-memory Map, очистка каждые 5 минут. Только для одного процесса; на Vercel с несколькими инстансами — подключите Upstash или Redis.
6. **INITIAL_ADMIN_EMAIL** в `.env` — первый пользователь с этим email автоматически получает роль ADMIN при входе.
7. **Защита последнего админа** — API не позволит понизить роль единственного администратора.
8. **Favicon / PWA** — файл `app/icon.svg`: буква «E» в начертании Tangerine 700, WOFF2 встроен в SVG (без рантайм-чтения файлов). После обновления `@fontsource/tangerine` выполните `npm run icons:build`.
