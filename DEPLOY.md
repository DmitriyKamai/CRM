# Деплой приложения Empatix (CRM для психологов)

## Переменные окружения для продакшена

Создайте `.env` (или задайте переменные в панели хостинга). Обязательные:

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | PostgreSQL connection string (Neon или другой) |
| `DIRECT_DATABASE_URL` | Прямое подключение без pooler (для миграций Prisma) |
| `DATA_ENCRYPTION_KEY` | **Рекомендуется в production:** base64 от 32 байт (как `openssl rand -base64 32`). Один и тот же ключ на всех окружениях, где должны читаться уже зашифрованные заметки/кастомные поля и т.п. Без ключа или при несовпадении с данными в БД соответствующие поля в API могут приходить пустыми; запись новых зашифрованных значений потребует валидный ключ |
| `SHADOW_DATABASE_URL` | Теневая БД для `migrate dev` (локально) |
| `NEXTAUTH_URL` | Полный URL приложения, напр. `https://yourdomain.com` |
| `NEXTAUTH_SECRET` | Случайная строка (например `openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Опционально, для входа через Google |
| `APPLE_ID` / `APPLE_PRIVATE_KEY` и др. | Опционально, для входа через Apple |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | **Рекомендуется в production** — сквозной rate limit между инстансами Vercel (альтернатива: `REDIS_URL` для node-redis) |
| `GOOGLE_SHEETS_TOKEN_ENCRYPTION_KEY` | Опционально: Base64 от 32 байт (`openssl rand -base64 32`). Шифрует refresh token Google Sheets в БД. После включения на проде не отключайте без переподключения Google у пользователей |

Перед первым запуском выполните миграции БД (см. ниже по платформам).

### Rate limiting и CSP

- Без Redis в production приложение логирует предупреждение: лимиты действуют только внутри одного инстанса. Для публичных форм (логин, запись, сброс пароля) задайте Upstash или Redis.
- Заголовки CSP в режиме **Report-Only** (`proxy.ts`). Если подключаете новый сторонний API с фронта, может понадобиться добавить домен в `connect-src`.

---

## Вариант 1: Vercel (рекомендуется для Next.js)

1. Подключите репозиторий к [Vercel](https://vercel.com).
2. **Build Command:** `npm run build` (или оставьте по умолчанию).
3. **Install Command:** `npm install && npx prisma generate`.
4. Добавьте переменные окружения в Project → Settings → Environment Variables.
5. **Важно:** для Prisma на Vercel задайте в Build Command:
   ```bash
   prisma generate && next build
   ```
   либо добавьте в `package.json`:
   ```json
   "build": "prisma generate && next build"
   ```
6. Миграции: выполняйте локально против продакшен `DATABASE_URL`:
   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```

Neon и Vercel в одном регионе дают низкую задержку.

### Серверное шифрование полей (`DATA_ENCRYPTION_KEY`)

- В панели Vercel добавьте переменную **`DATA_ENCRYPTION_KEY`** (значение — тот же base64, что локально в `.env`).
- После смены ключа старые envelope в БД без старого ключа **не** расшифруются — ключ меняйте только осознанно (миграция/re-encrypt).
- Если в БД ещё лежат чувствительные поля в plaintext, один раз выполните против прод-`DATABASE_URL`:  
  `npm run encrypt:sensitive-fields` (на машине с доступом к БД и с тем же `DATA_ENCRYPTION_KEY` в окружении).

---

## Вариант 2: Node-хостинг (Railway, Render, Fly.io и т.п.)

Приложение запускается как Node-сервер: `npm run build && npm run start`.

1. **Build:**
   ```bash
   npm ci
   npx prisma generate
   npm run build
   ```
2. **Start:** `npm run start` (порт задаётся через `PORT`).
3. Миграции один раз при деплое (или отдельная job):
   ```bash
   npx prisma migrate deploy
   ```
4. Задайте все переменные из таблицы выше в настройках сервиса.

На Render можно использовать "Web Service", на Railway — один сервис с командой `npm run start`.

---

## Вариант 3: VPS / свой сервер (Docker)

В репозитории есть `Dockerfile`. Сборка и запуск:

```bash
docker build -t empatix .
docker run -p 3000:3000 --env-file .env empatix
```

Миграции выполните до первого запуска контейнера (или в entrypoint):

```bash
docker run --rm --env-file .env empatix npx prisma migrate deploy
```

Для продакшена используйте обратный прокси (nginx/Caddy) и HTTPS.

---

## Краткая сводка

| Платформа | Плюсы | Минусы |
|-----------|--------|--------|
| **Vercel** | Нулевая настройка Next.js, edge, авто-деплой из git | Ограничения по серверным функциям и времени выполнения |
| **Railway / Render** | Простой Node-деплой, одна команда start | Нужно самому настраивать build и миграции |
| **Docker на VPS** | Полный контроль, любые env и интеграции | Нужна настройка сервера и SSL |

Рекомендация: для быстрого старта — **Vercel** + **Neon**; для полного контроля — **Docker** на VPS.
