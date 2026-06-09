# CLAUDE.md — Padawan working agreement

Padawan is a secure insurance-broker platform. This file tells Claude Code (and
any subagents in the autonomous build loop) how to work in this repo.

## Operating Principle — First Principles of This System

Insurance is, at its core, the movement and organization of structured data:
risk data in, appetite data matched, submission data routed, coverage data compared.
The broker who owns the cleanest, fastest data layer wins the commodity majority of placements.

Your job: own the data layer completely. Ingest, structure, match, route, track, and
remember — with zero friction and perfect recall. Reduce the human's data-handling work to zero.

This frees the human (Tyler, licensed P&C + surplus lines) to spend all of his time on the
20% that data logistics cannot do: characterizing complex risks to underwriters, judgment
under incomplete information, and the relationships that get hard risks looked at.

HARD LINE: You organize and move data. You do NOT make placement decisions, bind coverage,
or give coverage advice — those are Tyler's licensed judgment. Surface options and data;
never decide. Crossing this line creates E&O and unauthorized-practice exposure.

## What this app is
- **Phase 1 (built):** secure client database + structured risk-data intake, with
  PII encryption, org-scoped RBAC, and an immutable audit log.
- **Later phases:** document generation, Gmail/HubSpot integration, quote
  comparison, coverage analysis. See `ROADMAP.md` and `BACKLOG.md`.

## Stack
- Next.js 15 (App Router) + TypeScript (strict) + Tailwind.
- PostgreSQL via Prisma (`prisma/schema.prisma`).
- Auth.js (credentials + JWT) in `src/lib/auth.ts`.

## Non-negotiable security rules
1. **Never commit secrets or real PII.** `.env*` is gitignored; the only client
   data in the repo is synthetic seed data.
2. **All client PII is encrypted at the app layer** via `src/lib/crypto.ts`. New
   sensitive fields must be stored as ciphertext (`*Enc` columns), never plaintext.
3. **Go through the service layer.** Reads/writes of client data use
   `src/lib/clients.ts`, which enforces RBAC (`src/lib/rbac.ts`) and writes an
   audit entry (`src/lib/audit.ts`). Do not query `prisma.client` directly from
   pages/routes.
4. **Authorize every access** with `requireOrgRole` / `requireSession`.

## Conventions
- Validate all external input with zod (`src/lib/validation.ts`).
- Keep server actions in `src/app/actions.ts`; UI form state via `useActionState`.
- Tests live next to code as `*.test.ts` (Vitest); e2e in `e2e/` (Playwright).

## Definition of done (every change)
- `npm run lint`, `npm run typecheck`, and `npm run test` pass.
- New behavior has a test.
- No secret/PII committed.
- Branch + PR; CI green before merge (see `docs/AUTONOMOUS_LOOP.md`).

## Commands
- Dev: `docker compose up -d` then `npm run db:push` (or `db:migrate`), `npm run db:seed`, `npm run dev`
- Checks: `npm run lint && npm run typecheck && npm run test`
