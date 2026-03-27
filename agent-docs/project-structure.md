# Структура директорий

```text
app/                          # Next.js App Router
├── page.tsx                  # Лендинг (/)
├── auth/                     # Авторизация: login, register, forgot/reset-password
├── psychologist/             # Кабинет психолога: клиенты, расписание, диагностика, настройки
├── client/                   # Кабинет клиента: дашборд, список психологов, запись
├── admin/                    # Админка: пользователи, роли, аудит-лог, модули
├── diagnostics/[token]/      # Публичная страница прохождения теста по токену
└── api/                      # API-роуты (см. agent-docs/api.md)

lib/                          # Серверная бизнес-логика
├── auth.ts                   # NextAuth: providers, callbacks, JWT (oauthEnvConfig)
├── db.ts                     # Prisma-клиент (singleton)
├── rate-limit.ts             # Rate limiter: Upstash → Redis → in-memory
├── google-sheets-refresh-token-crypto.ts  # AES-256-GCM для refresh token Google Sheets
├── api-error.ts              # Стандартизированная обработка ошибок API
├── audit-log.ts              # Аудит-лог (best-effort запись)
├── client-history.ts         # Лента истории действий по клиенту
├── platform-modules.ts       # Feature flags: scheduling, diagnostics
├── email.ts                  # SMTP (fallback — лог в консоль)
├── telegram.ts               # Telegram-уведомления
├── security/
│   └── api-guards.ts         # Auth guards: requireAuth, requirePsychologist, requireAdmin и др.
└── diagnostics/
    ├── shmishek.ts           # Расчёт и интерпретация Шмишека
    ├── pavlova.ts            # Расчёт и интерпретация Павлова
    ├── smil.ts               # Расчёт СМИЛ
    ├── smil-questions.ts     # Загрузка вопросов СМИЛ из JSON
    ├── link-validation.ts    # Общая валидация diagnostic link
    ├── submit-result.ts      # Общая логика сохранения результата теста
    ├── create-link.ts        # Общая логика создания diagnostic link
    └── token.ts              # crypto.randomUUID()

components/                   # React-компоненты
├── ui/                       # shadcn/ui компоненты (Radix UI)
├── psychologist/             # Компоненты кабинета психолога
├── client/                   # Компоненты кабинета клиента
├── admin/                    # Компоненты админки
├── diagnostics/              # Формы тестов
└── auth/                     # Формы входа/регистрации

hooks/                        # Query-first hooks и локальные workflow hooks

prisma/
├── schema.prisma             # Схема БД
├── migrations/               # История миграций
├── seed-shmishek.ts          # Seed: вопросы и шкалы Шмишека
├── seed-pavlova.ts           # Seed: вопросы и шкалы Павлова
└── seed-smil.ts              # Seed: вопросы и шкалы СМИЛ

__tests__/                    # Vitest юнит-тесты
├── diagnostics/              # Тесты на расчёт диагностик
└── lib/                      # rate-limit, валидация, crypto Google Sheets

types/
└── next-auth.d.ts            # Расширение типов Session / JWT / User
```
