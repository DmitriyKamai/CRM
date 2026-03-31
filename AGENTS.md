# AGENTS.md

## General rules

- **Все ответы агента должны быть только на русском языке.** Комментарии в коде, сообщения коммитов, описания PR и любое общение с пользователем — всё на русском.
- **Git:** после **`git commit`** выполняй **`git push`** в удалённый репозиторий (обычно `origin` и актуальная ветка), если пользователь явно не просил не пушить. Локальный коммит без push не считается завершением задачи для CI/деплоя.

---

## О проекте (кратко)

**Empatix** — CRM для психологов и их клиентов.  
Стек: Next.js 16 (App Router), TypeScript, Prisma ORM, PostgreSQL.

Роли: `PSYCHOLOGIST`, `CLIENT`, `ADMIN`.  
Первый администратор назначается через `INITIAL_ADMIN_EMAIL` в `.env`.  
Серверное шифрование чувствительных полей требует `DATA_ENCRYPTION_KEY` (32 байта в base64, см. `.env.example`). На **Vercel** добавьте тот же ключ в Project → Settings → Environment Variables (Production/Preview), иначе расшифровка envelope вернёт пусто и в логах будет предупреждение.

---

## Операционные правила для агента

### Режимы запуска

- Для HMR использовать `npm run dev:turbopack` или `npm run dev:no`.
- `npm run dev` / `npm run dev:stable` — это `next build && next start` (без hot-reload).

### Базовые проверки качества

Минимальный набор перед завершением значимых изменений:

```bash
npm run lint
npm run typecheck
npm run test
```

### Критичные архитектурные принципы

- Соблюдать `single responsibility`:
  - компонент — один UI-сценарий;
  - hook — один источник данных или один workflow;
  - утилита — одна вычислительная задача.
- Для server state использовать **TanStack Query**; не дублировать те же данные в Redux.
- Перед `useEffect` + `fetch` проверять, можно ли решить через query/mutation hook.
- Крупные экраны дробить по порядку: `hooks` → `подкомпоненты` → `lib`-утилиты.
- Оркестратор экрана не должен одновременно содержать тяжёлую сетевую логику и массивную JSX-разметку.

### Критичные технические нюансы

- `proxy.ts` в Next.js 16 заменяет middleware; не создавать `middleware.ts`.
- Без Redis/Upstash лимитер работает in-memory в рамках одного процесса.
- `npm run build` запускает `prisma generate` + `migrate-deploy` + `next build`.
- `ClientProfile` может существовать без `userId` (офлайн-клиент).

---

## Подробная документация

- Архитектура и паттерны: `agent-docs/architecture.md`
- API роуты: `agent-docs/api.md`
- Структура директорий: `agent-docs/project-structure.md`
