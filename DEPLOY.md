# Деплой приложения Empatix (CRM для психологов)

## Переменные окружения для продакшена

Создайте `.env` (или задайте переменные в панели хостинга). Обязательные:

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | PostgreSQL connection string (Neon или другой) |
| `NEXTAUTH_URL` | Полный URL приложения, напр. `https://yourdomain.com` |
| `NEXTAUTH_SECRET` | Случайная строка (например `openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Опционально, для входа через Google |
| `APPLE_ID` / `APPLE_PRIVATE_KEY` и др. | Опционально, для входа через Apple |

Перед первым запуском выполните миграции БД (см. ниже по платформам).

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
