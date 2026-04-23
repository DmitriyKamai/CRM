-- Справочник психотерапевтических подходов и M2M c PsychologistProfile.

CREATE TABLE "TherapyApproach" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "nameRu" TEXT NOT NULL,
  "family" TEXT NOT NULL,
  "description" TEXT,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TherapyApproach_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TherapyApproach_slug_key" ON "TherapyApproach"("slug");
CREATE INDEX "TherapyApproach_family_orderIndex_idx" ON "TherapyApproach"("family", "orderIndex");

-- Implicit M2M таблица по соглашению Prisma: имя отношения `PsychologistTherapyApproaches`.
-- Алфавитный порядок сторон: Psychologist... < Therapy..., поэтому A = PsychologistProfile, B = TherapyApproach.
CREATE TABLE "_PsychologistTherapyApproaches" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_PsychologistTherapyApproaches_AB_pkey" PRIMARY KEY ("A", "B")
);

CREATE INDEX "_PsychologistTherapyApproaches_B_index" ON "_PsychologistTherapyApproaches"("B");

ALTER TABLE "_PsychologistTherapyApproaches"
  ADD CONSTRAINT "_PsychologistTherapyApproaches_A_fkey"
  FOREIGN KEY ("A") REFERENCES "PsychologistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_PsychologistTherapyApproaches"
  ADD CONSTRAINT "_PsychologistTherapyApproaches_B_fkey"
  FOREIGN KEY ("B") REFERENCES "TherapyApproach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Первичный сид справочника (идемпотентно по slug). MVP-набор, дальше редактируется скриптом.
INSERT INTO "TherapyApproach" ("id", "slug", "nameRu", "family", "description", "orderIndex", "updatedAt") VALUES
  -- Базовые (top-level, для фильтра каталога)
  ('ta_cbt',            'cbt',             'КПТ',                        'base',          'Когнитивно-поведенческая терапия: работа с мыслями, эмоциями и поведением.', 10, CURRENT_TIMESTAMP),
  ('ta_gestalt',        'gestalt',         'Гештальт-терапия',           'base',          'Фокус на переживании «здесь и сейчас» и осознанном контакте с собой и другими.', 20, CURRENT_TIMESTAMP),
  ('ta_psychoanalysis', 'psychoanalysis',  'Психоанализ',                'base',          'Классический анализ бессознательных конфликтов, переносов и защит.', 30, CURRENT_TIMESTAMP),
  ('ta_emdr',           'emdr',            'EMDR',                       'base',          'Переработка травматического опыта через билатеральную стимуляцию.', 40, CURRENT_TIMESTAMP),
  ('ta_schema',         'schema_therapy',  'Схема-терапия',              'base',          'Работа с ранними дезадаптивными схемами и режимами личности.', 50, CURRENT_TIMESTAMP),
  ('ta_existential',    'existential',     'Экзистенциальная терапия',   'base',          'Смысл, свобода, одиночество, конечность — ключевые темы работы.', 60, CURRENT_TIMESTAMP),
  ('ta_systemic_fam',   'systemic_family', 'Системная семейная терапия', 'base',          'Рассматривает семью как систему с ролями, связями и правилами.', 70, CURRENT_TIMESTAMP),
  ('ta_person_centered','person_centered', 'Клиент-центрированная',      'base',          'Подход Карла Роджерса: эмпатия, принятие, конгруэнтность.', 80, CURRENT_TIMESTAMP),
  ('ta_ta',             'transactional',   'Транзактный анализ',         'base',          'Анализ эго-состояний «Родитель-Взрослый-Ребёнок» и сценариев жизни.', 90, CURRENT_TIMESTAMP),
  ('ta_body',           'body_oriented',   'Телесно-ориентированная',    'base',          'Работа с психикой через тело, дыхание и двигательные паттерны.', 100, CURRENT_TIMESTAMP),

  -- Третья волна КПТ
  ('ta_act',            'act',             'ACT',                        'third_wave',    'Терапия принятия и ответственности: гибкость и действия по ценностям.', 10, CURRENT_TIMESTAMP),
  ('ta_dbt',            'dbt',             'DBT',                        'third_wave',    'Диалектико-поведенческая терапия: регуляция эмоций и устойчивость.', 20, CURRENT_TIMESTAMP),
  ('ta_mbct',           'mbct',            'Mindfulness / MBCT',         'third_wave',    'Практики осознанности и когнитивная терапия на их основе.', 30, CURRENT_TIMESTAMP),

  -- Парная и семейная (помимо системной)
  ('ta_eft',            'eft_couples',     'ЭФТ (пары)',                 'couple',        'Эмоционально-фокусированная терапия пар по С. Джонсон.', 10, CURRENT_TIMESTAMP),

  -- Краткосрочные
  ('ta_sfbt',           'sfbt',            'ОРКТ (SFBT)',                'brief',         'Краткосрочная терапия, ориентированная на решения и ресурсы.', 10, CURRENT_TIMESTAMP),

  -- Травматерапия / интегративные
  ('ta_ifs',            'ifs',             'IFS (Внутренние семейные системы)', 'trauma', 'Работа с субличностями и исцеление ран «частей» личности.', 10, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "nameRu" = EXCLUDED."nameRu",
  "family" = EXCLUDED."family",
  "description" = EXCLUDED."description",
  "orderIndex" = EXCLUDED."orderIndex",
  "updatedAt" = CURRENT_TIMESTAMP;
