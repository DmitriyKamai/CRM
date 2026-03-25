# AGENTS.md

## General rules

- **Все ответы агента должны быть только на русском языке.** Комментарии в коде, сообщения коммитов, описания PR и любое общение с пользователем — всё на русском.

## Cursor Cloud specific instructions

### Product overview

Empatix is a Psychologist CRM built with **Next.js 16 (App Router)**, **TypeScript**, **Prisma ORM**, and **PostgreSQL**. It serves psychologists (client management, scheduling, diagnostic tests) and their clients (booking, test results). The UI is in Russian.

### Services

| Service | Required | How to run |
|---------|----------|------------|
| PostgreSQL | Yes | `sudo pg_ctlcluster 16 main start` (already running after setup) |
| Next.js app | Yes | See below |

Optional services (Telegram bot, Redis, SMTP, Google/Apple OAuth, Vercel Blob) are **not** required for local development.

### Running the application

- **Dev mode with HMR** (Turbopack): `npm run dev:turbopack` — fastest iteration, but the `/psychologist/settings` page may crash the dev server.
- **Dev mode with Webpack**: `npm run dev:no` — more stable alternative to Turbopack.
- **Stable dev** (build + start): `npm run dev` or `npm run dev:stable` — builds then runs production server. Use when you need to test pages that crash in dev mode (e.g. `/psychologist/settings`).
- **Build only**: `npm run build:next`
- **Start (after build)**: `npm run start`

### Lint / Typecheck / Build

Commands are in `package.json`:
- `npm run lint` — ESLint with `--max-warnings=0`
- `npm run typecheck` — `tsc --noEmit`
- `npm run build:next` — production build (webpack)

### Database

- Schema: `prisma/schema.prisma`
- **For fresh local setup**, use `npx prisma db push` instead of `npx prisma migrate deploy` — the migration directory has an ordering issue where `20260309*` sorts before `20260315_init_from_schema`, causing failures on empty databases. `db push` syncs the schema directly.
- Seed diagnostic tests: `npm run prisma:seed`
- Required `.env` vars: `DATABASE_URL`, `DIRECT_DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`

### Gotchas

- The `npm run dev` script is **not** a hot-reloading dev server — it runs `next build && next start`. For HMR, use `npm run dev:turbopack` or `npm run dev:no`.
- `postinstall` hook runs `scripts/patch-next-dev.js` which patches Next.js dev server for V8 crash auto-restart on Windows.
- The `npm run build` script runs both `prisma generate`, `migrate-deploy`, and `next build`. For just the Next.js build, use `npm run build:next`.
