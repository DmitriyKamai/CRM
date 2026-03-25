# Миграции Prisma

## Текущая стратегия

`20260315120000_init_from_schema` — основная миграция, создаёт всю схему (включая `profilePhotoUrl` / `profilePhotoPublished` в `PsychologistProfile`). Остальные миграции — инкрементальные.

Миграция `20260309225214_add_psychologist_profile_photo` — **no-op** (`SELECT 1`). Столбцы, которые она раньше добавляла, теперь включены в `init_from_schema`. Миграция сохранена для совместимости с продакшеном, где она уже записана в `_prisma_migrations`.

## Новое окружение

```bash
npx prisma migrate deploy     # применить все миграции
npm run prisma:seed            # заполнить тестами
```

## Деплой после обновления миграций (P3005 checksum mismatch)

Если продакшен-БД ранее применяла версию `20260309225214` или `20260315120000` с другим checksum, при деплое будет ошибка **P3005**. Решение:

```bash
# Выполнить один раз с продовым DATABASE_URL:
npx prisma migrate resolve --applied 20260309225214_add_psychologist_profile_photo
npx prisma migrate resolve --applied 20260315120000_init_from_schema
```

Это обновит checksum в `_prisma_migrations` и позволит `prisma migrate deploy` продолжить.

## Дальнейшие изменения схемы

```bash
npx prisma migrate dev --name описание_изменения
```
