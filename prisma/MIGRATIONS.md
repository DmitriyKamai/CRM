# Миграции Prisma

## Текущая стратегия

Одна миграция `20260325180000_init` создаёт всю схему из `schema.prisma`.

## Новое окружение

```bash
npx prisma migrate deploy     # применить миграцию
npm run prisma:seed            # заполнить диагностические тесты
```

Для production при использовании импорта из Google Sheets задайте `GOOGLE_SHEETS_TOKEN_ENCRYPTION_KEY` (см. `DEPLOY.md`) — токены в таблице `PsychologistProfile` будут шифроваться в приложении.

## Дальнейшие изменения схемы

```bash
npx prisma migrate dev --name описание_изменения
```
