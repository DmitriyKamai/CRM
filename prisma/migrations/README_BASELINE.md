# Baseline миграций

История миграций синхронизирована с текущей БД: все 4 миграции помечены как применённые (`prisma migrate resolve --applied`).

При запуске `prisma migrate dev` может появляться **Drift detected**, потому что в БД есть изменения (таблицы Notification, ClientRegistrationInvite, правки ClientProfile и др.), которых нет в файлах миграций 1–3. Миграция `20250307160000_baseline_sync` фиксирует только уникальное ограничение для `ClientRegistrationInvite`.

**Не делайте `prisma migrate reset`** — будут удалены все данные.

**Как жить дальше:**
- Для применения новых изменений схемы используйте **`prisma db push`** (как при добавлении уникального ограничения), либо
- Сделайте полный baseline с отдельной shadow-БД (см. ниже), чтобы `migrate dev` перестал показывать drift.

## Полный baseline (убрать drift в migrate dev)

1. Создайте отдельную пустую БД (например, ветку в Neon).
2. В `.env` добавьте: `SHADOW_DATABASE_URL="postgresql://.../shadow_db?sslmode=require"`.
3. В `schema.prisma` в блоке `datasource db` добавьте строку:  
   `shadowDatabaseUrl = env("SHADOW_DATABASE_URL")`
4. Сгенерируйте дельту:
   ```bash
   npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "%SHADOW_DATABASE_URL%" --script -o prisma/migrations/20250307160000_baseline_sync/migration.sql
   ```
   (В PowerShell замените `%SHADOW_DATABASE_URL%` на `$env:SHADOW_DATABASE_URL`.)
5. Пометить миграцию как применённую заново (обновит checksum):
   ```bash
   npx prisma migrate resolve --rolled-back 20250307160000_baseline_sync
   npx prisma migrate resolve --applied 20250307160000_baseline_sync
   ```
6. После этого `prisma migrate dev` не должен предлагать сброс.
