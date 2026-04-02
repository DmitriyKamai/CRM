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

## Настройки профиля (`/settings`)

- **Маршрут:** [`app/settings/page.tsx`](../app/settings/page.tsx) — единая страница для `CLIENT` и `PSYCHOLOGIST`; админ перенаправляется. Точка входа клиента: [`app/settings/settings-page-entry.tsx`](../app/settings/settings-page-entry.tsx) (динамические импорты форм по роли).
- **Данные (личные vs ролевые):**
  - **`User`** — общие личные поля: `firstName`, `lastName`, `name` (отображаемое ФИО, пересчитывается при сохранении), `email`, `image`, `dateOfBirth`, `phone`, `country`, `city`, `gender`, `maritalStatus`.
  - **`PsychologistProfile`** — только данные практики: `specialization`, `bio`, публичные контакты, фото каталога, `settingsJson`, Google Sheets token и т.д. **Не дублировать** личные поля психолога в этой модели.
  - **`ClientProfile`** — карточка клиента у конкретного психолога (CRM); не путать с «моими настройками» в кабинете клиента. При изменении личных данных клиентом сервер может синхронизировать часть полей в связанные `ClientProfile` (см. `PATCH /api/user/profile`).
- **API:** `GET`/`PATCH` [`/api/user/profile`](../app/api/user/profile/route.ts); тип ответа — [`lib/user-settings/types.ts`](../lib/user-settings/types.ts) (`UserSettingsProfile`: `user` + `psychologistProfile` | `null`).
- **Клиентский UI:**
  - Запросы настроек: [`hooks/use-user-settings.ts`](../hooks/use-user-settings.ts) (`useClientSettings` / `useProfileSettings` — обёртки с `variant`).
  - Форма личных данных: [`hooks/use-personal-profile-tab-ui.ts`](../hooks/use-personal-profile-tab-ui.ts) + [`components/settings/shared/personal-profile-form.tsx`](../components/settings/shared/personal-profile-form.tsx).
  - Общая оболочка вкладок: [`components/settings/shared/settings-form-tabs-layout.tsx`](../components/settings/shared/settings-form-tabs-layout.tsx) — три базовые вкладки (`profile`, `security`, `accounts`), проп `profileTabFooter` для доп. блоков на вкладке «Личные данные», `children` — дополнительные `TabsContent` (у психолога: профессиональный профиль, календарь, поля клиента, статусы).
  - Клиент: [`components/client/settings/client-settings-form.tsx`](../components/client/settings/client-settings-form.tsx) + [`client-settings-tabs-list.tsx`](../components/settings/shared/client-settings-tabs-list.tsx).
  - Психолог: [`components/psychologist/settings-form.tsx`](../components/psychologist/settings-form.tsx) + [`psychologist-tabs-list.tsx`](../components/psychologist/settings/psychologist-tabs-list.tsx); профессиональная вкладка — [`hooks/use-professional-tab-ui.ts`](../hooks/use-professional-tab-ui.ts).
- **Плановые улучшения (не блокеры):** при необходимости отдельные поля только для клиента — новая 1:1-модель в Prisma + блок в `profileTabFooter` или отдельная вкладка, без дублирования `User` и без смешения с CRM-`ClientProfile`; по желанию объединить `useClientSettings`/`useProfileSettings`.

## Быстрые ссылки

- Полный API: `agent-docs/api.md`
- Структура проекта: `agent-docs/project-structure.md`
- Основной contract-файл для агента: `AGENTS.md`
