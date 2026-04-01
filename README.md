# Empatix

CRM для психологов и их клиентов: клиентская база, расписание и запись на приём, психологические диагностики, администрирование и интеграции.

| Роль | Возможности |
|------|-------------|
| **Психолог** | Клиенты (в т.ч. офлайн без аккаунта), статусы и пользовательские поля, импорт/экспорт, расписание, ссылки на тесты, рекомендации, подписка на календарь (ICS), опционально Google Таблицы |
| **Клиент** | Запись к психологу, личный кабинет, прохождение тестов по ссылке |
| **Администратор** | Пользователи и роли, модули платформы, аудит, управление тестами |

## Стек

- **Next.js 16** (App Router), **React**, **TypeScript**
- **Prisma** + **PostgreSQL**
- **NextAuth** (email/пароль, Google, Apple — по настройке `.env`)
- **TanStack Query** (server state), **Redux Toolkit** (часть клиентского UI-state)
- **Tailwind CSS**, компоненты в духе **shadcn/ui** (Radix)
- Заголовки безопасности и CSP — **`proxy.ts`** (в Next.js 16 вместо `middleware.ts`)

## Быстрый старт

```bash
npm install
cp .env.example .env
# Заполните DATABASE_URL, DIRECT_DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, DATA_ENCRYPTION_KEY
npm run prisma:migrate
npm run prisma:seed   # опционально: вопросы Шмишека, Павлова, СМИЛ
```

### Режимы разработки

| Команда | Назначение |
|---------|------------|
| **`npm run dev:turbopack`** | Dev с HMR (Turbopack). На части страниц возможны сбои — см. ниже. |
| **`npm run dev:no`** | Dev с HMR (**Webpack**) — обычно стабильнее на Windows. |
| **`npm run dev`** / **`npm run dev:stable`** | **Не hot-reload:** `next build && next start` — как мини-прод для проверки. |

Откройте [http://localhost:3000](http://localhost:3000).

**Сеть / телефон:** в `.env` укажите `NEXTAUTH_URL` с IP вашего ПК в LAN (например `http://192.168.1.10:3000`), иначе сессия с других устройств может не работать.

**Страница `/settings` в dev:** при падениях процесса используйте `npm run dev:no` или `npm run dev:stable`.

### Проверки перед коммитом / деплоем

```bash
npm run lint
npm run typecheck
npm run test
```

Полная production-сборка (миграции + webpack-сборка): **`npm run build`**.

## Скрипты npm (выборочно)

| Скрипт | Описание |
|--------|----------|
| `build` | `prisma generate`, миграции deploy, `next build --webpack` |
| `build:next` | Только сборка Next без миграций |
| `prisma:migrate` | Локально: `prisma migrate dev` |
| `prisma:migrate:deploy` | Применить миграции из репозитория (CI/прод) |
| `prisma:seed` | Сиды вопросов Шмишека, Павлова, СМИЛ |
| `bot` | Telegram-бот (нужен `TELEGRAM_BOT_TOKEN`) |
| `icons:build` | Пересборка `app/icon.svg` после обновления шрифта Tangerine |

## Структура репозитория

| Путь | Содержимое |
|------|------------|
| `app/` | Маршруты App Router, API `app/api/*` |
| `components/` | UI по зонам (`psychologist/`, `client/`, `admin/`, `ui/`) |
| `hooks/` | Хуки данных и сценариев (в т.ч. TanStack Query) |
| `lib/` | Доменная логика, guards, rate-limit, диагностики, календарь |
| `prisma/` | `schema.prisma`, миграции, сиды |
| `store/` | Redux slices |
| `agent-docs/` | Расширенная документация для разработки (API, архитектура, дерево) |
| `proxy.ts` | CSP и прочие заголовки (не добавлять `middleware.ts`) |
| `vercel.json` | Cron очистки слотов (сейчас раз в сутки из‑за лимита Vercel; в проде при возможности — чаще, см. комментарий в `app/api/cron/schedule-slot-cleanup/route.ts`) |

Подробнее о каталогах: [`agent-docs/project-structure.md`](agent-docs/project-structure.md).

## Аутентификация и роли

- Конфигурация: `lib/auth.ts`, роут `app/api/auth/[...nextauth]/route.ts`.
- Регистрация: `POST /api/auth/register`, страницы `/auth/register/psychologist`, `/auth/register/client`.
- **Первый админ:** в `.env` задайте `INITIAL_ADMIN_EMAIL` — пользователь с этим email получит роль `ADMIN` при входе.

## Расписание

- Слоты и записи: модели `ScheduleSlot`, `Appointment`.
- **Чтение без побочных эффектов:** `GET /api/schedule/slots`.
- **Очистка БД:** `POST /api/schedule/slots/cleanup` (вызывается клиентом перед загрузкой слотов) и фоновый **`GET /api/cron/schedule-slot-cleanup`** (сейчас по cron раз в сутки; при апгрейде Vercel можно снова ставить каждые 15 минут в `vercel.json`) — нужен **`CRON_SECRET`** в окружении (см. `.env.example`, `vercel.json`).
- Запись клиента: публичные слоты и `POST /api/appointments`.

## Календарь ICS (Google / Apple)

- Секретная ссылка: `GET /api/calendar/feed-url` (сессия психолога), фид: `GET /api/calendar/feed/<token>` (старый вариант `?token=` по-прежнему работает).
- В интерфейсе: настройки психолога (вкладка «Календарь») — кнопки подписки в Google и Apple Calendar.

## Диагностики

Поддерживаются методики **Шмишек**, **Павлова**, **СМИЛ** (логика в `lib/diagnostics/*`, публичное прохождение `/diagnostics/[token]`).

```bash
npm run prisma:seed
```

Демо-формулировки в сидах не претендуют на юридическую валидность опросников для клинической практики — при необходимости замените материалы.

## Переменные окружения

Ориентир — **`.env.example`**. Для продакшена см. **[`DEPLOY.md`](DEPLOY.md)** (Neon, Vercel, **`DATA_ENCRYPTION_KEY`**, Redis/Upstash, Google Sheets encryption, `CRON_SECRET`). Кратко о шифровании полей на сервере — **[`SECURITY.md`](SECURITY.md)**.

## Безопасность

Подробно: **[`SECURITY.md`](SECURITY.md)** — rate limiting, ICS-токены, аудит, CSP.

## Документация для разработки

- **[`AGENTS.md`](AGENTS.md)** — правила для ИИ-агентов и ссылки на детали.
- **[`agent-docs/api.md`](agent-docs/api.md)** — обзор API.
- **[`agent-docs/architecture.md`](agent-docs/architecture.md)** — паттерны кода.
- **[`DEPLOY.md`](DEPLOY.md)** — деплой и env.

## Windows: Prisma `EPERM` (rename query engine)

1. Остановите все процессы Node (dev, тесты, бот).
2. По возможности держите проект вне OneDrive.
3. `npm run prisma:generate:clean`
4. Если не помогло — закройте IDE, в PowerShell: `.\scripts\prisma-generate-windows.ps1 -KillNode` (см. комментарии в скрипте).

## Windows: падение сборки `0xC0000005` / Turbopack

1. Сборка уже идёт через **Webpack** (`next build --webpack` в `package.json`).
2. Задан запас по памяти (`NODE_OPTIONS`); при нехватке — увеличьте `max-old-space-size`.
3. Очистка `.next` и повтор `npm run build` или `npm run build:next`.
4. В `next.config.mjs` для Windows ограничение CPU и отключение `webpackBuildWorker` — см. файл.

ESLint при `next build` отдельно не вшит — перед релизом запускайте **`npm run lint`**.

## Схема БД

Полная модель — **`prisma/schema.prisma`**. Кратко: `User`, `PsychologistProfile`, `ClientProfile` (допускается без `userId` — «офлайн-клиент»), расписание, записи, тесты и результаты, `DiagnosticLink`, пользовательские поля, файлы (Vercel Blob), `CalendarFeedToken`, `AuditLog`, `PlatformSettings` (модули `scheduling` / `diagnostics`).

---

*Основное приложение собирается из корня репозитория.*
