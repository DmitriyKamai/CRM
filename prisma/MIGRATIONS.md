# Миграции Prisma

## Текущая стратегия

Одна миграция `20260325180000_init` создаёт всю схему из `schema.prisma`.

## Новое окружение

```bash
npx prisma migrate deploy     # применить миграцию
npm run prisma:seed            # заполнить диагностические тесты
```

## Дальнейшие изменения схемы

```bash
npx prisma migrate dev --name описание_изменения
```
