# Архитектура и паттерны

Документ для быстрых решений агента: что обязательно соблюдать и где искать детали.

## Базовые принципы

- Разделять ответственность:
  - **server state** — через TanStack Query;
  - **client global state** — через Redux Toolkit;
  - **локальный state** — через `useState`.
- Не дублировать одни и те же данные в Redux и Query-кэше.
- Для новых API-сценариев по умолчанию использовать query/mutation hooks, а не `fetch` в `useEffect`.
- Крупные экраны дробить в порядке: `hooks` → `подкомпоненты` → `lib`-утилиты.
- Оркестратор экрана не должен одновременно содержать тяжёлую сетевую логику и массивную JSX-разметку.
- Для мутаций заранее выбирать стратегию: оптимистичное обновление (`setQueryData`) и/или `invalidateQueries`.

## Критичные серверные контракты

- Все защищённые API-роуты строить через `lib/security/api-guards.ts` (`requireAuth`, `requirePsychologist`, `requireAdmin` и др.).
- Feature flags проверять через `lib/platform-modules.ts` (`assertModuleEnabled`).
- Для диагностики использовать общие модули из `lib/diagnostics/` (`link-validation`, `submit-result`, `create-link`).
- Для списка клиентов использовать `lib/clients/clients-query-schema.ts` и `lib/clients/build-clients-where.ts`.

## Критичные технические нюансы

- `proxy.ts` в Next.js 16 заменяет middleware; `middleware.ts` создавать нельзя.
- `npm run dev` / `npm run dev:stable` = `next build && next start` (без HMR).
- `npm run build` запускает `prisma generate` + `migrate-deploy` + `next build`.
- Без Redis/Upstash rate limit работает in-memory в рамках одного процесса.
- `ClientProfile` может быть без `userId` (офлайн-клиент).
- Чувствительные строки в БД (заметки клиента, значения кастомных полей, часть диагностик и рекомендаций и т.д.) могут храниться в виде **серверного envelope** (`lib/server-encryption/`). Ключ **`DATA_ENCRYPTION_KEY`**, поведение при отсутствии/ошибке ключа — см. **`SECURITY.md`**, **`DEPLOY.md`**, **`.env.example`**.

## Быстрые ссылки

- Полный API: `agent-docs/api.md`
- Структура проекта: `agent-docs/project-structure.md`
- Основной contract-файл для агента: `AGENTS.md`
