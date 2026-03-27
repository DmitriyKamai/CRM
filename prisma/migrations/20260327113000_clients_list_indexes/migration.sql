-- Ускорение выборки списка клиентов психолога:
-- 1) пагинация и сортировка по createdAt
-- 2) фильтр по statusId + сортировка
-- 3) поиск contains/ILIKE по полям карточки клиента

-- Для ILIKE/contains индексов нужен pg_trgm.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Базовые btree-индексы под where psychologistId/statusId + order by createdAt desc.
CREATE INDEX IF NOT EXISTS "ClientProfile_psychologistId_createdAt_idx"
  ON "ClientProfile" ("psychologistId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "ClientProfile_psychologistId_statusId_createdAt_idx"
  ON "ClientProfile" ("psychologistId", "statusId", "createdAt" DESC);

-- Trigram-индексы для contains/ILIKE поиска.
CREATE INDEX IF NOT EXISTS "ClientProfile_firstName_trgm_idx"
  ON "ClientProfile" USING GIN ("firstName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "ClientProfile_lastName_trgm_idx"
  ON "ClientProfile" USING GIN ("lastName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "ClientProfile_email_trgm_idx"
  ON "ClientProfile" USING GIN ("email" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "ClientProfile_phone_trgm_idx"
  ON "ClientProfile" USING GIN ("phone" gin_trgm_ops);
