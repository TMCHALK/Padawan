# Padawan

A secure insurance-broker platform: collect customer risk data, manage clients,
and (over upcoming phases) generate insurance documents, sync with Gmail/HubSpot,
compare quotes, and analyze coverage. Built to handle real PII from day one.

> Status: **Phase 1 — secure foundation** (client database + risk-data intake).
> See `ROADMAP.md` for what's next and `BACKLOG.md` for the working queue.

## Quick start

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env.local
#   - set AUTH_SECRET:        openssl rand -base64 32
#   - set PII_ENCRYPTION_KEY: openssl rand -base64 32   (must decode to 32 bytes)
#   - set DATABASE_URL        (a local Postgres is provided below)

# 3. Start Postgres + sync schema + seed synthetic data
docker compose up -d
npm run db:push
npm run db:seed

# 4. Run
npm run dev   # http://localhost:3000
```

Demo login (from the seed): `demo@padawan.local` / `password123`.

## Checks

```bash
npm run lint
npm run typecheck
npm run test        # unit (Vitest)
npm run test:e2e    # end-to-end (Playwright; needs a running app + db)
```

## How it's built

- **Next.js 15** (App Router) + **TypeScript** (strict) + **Tailwind**
- **PostgreSQL** via **Prisma** — `prisma/schema.prisma`
- **Auth.js** (credentials + JWT) — `src/lib/auth.ts`
- **Security baseline:** AES-256-GCM PII encryption (`src/lib/crypto.ts`),
  org-scoped RBAC (`src/lib/rbac.ts`), immutable audit log (`src/lib/audit.ts`),
  all client access funneled through `src/lib/clients.ts`.

## Security notes

- Never commit `.env*` or real client data. Only synthetic data lives in the repo.
- PII is encrypted at the application layer; the database stores only ciphertext.
- Hosting real PII implies legal/compliance obligations (GLBA, state insurance
  regulations; HIPAA if health data) — get a compliance review before onboarding
  real clients. See `ROADMAP.md`.

## Autonomous development

This repo is set up to be built out by Claude Code on a schedule with multi-agent
orchestration and CI safety gates. See `docs/AUTONOMOUS_LOOP.md`.
