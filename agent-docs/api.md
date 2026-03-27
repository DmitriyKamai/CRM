# API роуты

## Авторизация (`/api/auth/`)

| Роут | Метод | Описание |
|------|-------|----------|
| `[...nextauth]` | GET/POST | NextAuth handler (credentials, Google, Apple) |
| `register` | POST | Регистрация (role: psychologist/client) |
| `forgot-password` | POST | Запрос сброса пароля |
| `reset-password` | POST | Сброс пароля по токену |
| `oauth-link-intent` | POST | Привязка OAuth к существующему аккаунту |

## Психолог (`/api/psychologist/`)

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
| `google-sheets/*` | - | Интеграция с Google Sheets |

`GET /api/psychologist/clients` работает с server-side пагинацией и поиском:
- query: `page` (>=1), `pageSize` (20..50), `statusId?`, `q?` (поиск от 2 символов);
- сортировка: `createdAt desc`;
- ответ: `{ clients, pagination: { page, pageSize, total, totalPages } }`.

## Диагностика (`/api/diagnostics/`)

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

## Расписание (`/api/schedule/`, `/api/appointments/`)

| Роут | Метод | Описание |
|------|-------|----------|
| `schedule/slots` | GET/POST | Слоты психолога (GET только чтение) |
| `schedule/slots/cleanup` | POST | Явная очистка застрявших/прошлых пустых слотов текущего психолога |
| `schedule/slots/[id]` | PATCH/DELETE | Управление слотом |
| `cron/schedule-slot-cleanup` | GET | Фоновая глобальная очистка (Bearer `CRON_SECRET`, Vercel Cron сейчас раз в сутки `0 3 * * *`; при снятии лимита Vercel — вернуть `*/15 * * * *` в `vercel.json`) |

## Календарь (ICS)

| Роут | Метод | Описание |
|------|-------|----------|
| `calendar/feed-url` | GET | `{ url, lastFetchedAt, createdAt }` — ссылка на ICS и время последнего успешного запроса фида |
| `calendar/feed-url` | POST | Перевыпуск токена; тело ответа как у GET |
| `calendar/feed/[token]` | GET | ICS по токену в path (основной URL из `feed-url`; обновляет `lastFetchedAt`) |
| `calendar/feed` | GET | ICS по `?token=` (совместимость) |
| `schedule/psychologists` | GET | Список психологов (публичный) |
| `schedule/psychologists/[id]/slots` | GET | Свободные слоты (публичный) |
| `appointments` | POST | Запись на приём |
| `appointments/[id]` | PATCH | Смена статуса записи |

## Админка (`/api/admin/`)

| Роут | Метод | Описание |
|------|-------|----------|
| `users` | GET | Список пользователей |
| `users/[id]/role` | PATCH | Смена роли (с защитой последнего админа) |
| `audit-log` | GET | Аудит-лог с фильтрами |
| `tests` | GET | Список тестов |
| `tests/[id]` | PATCH | Вкл/выкл теста |
| `platform-modules` | GET/PATCH | Feature flags (scheduling, diagnostics) |
