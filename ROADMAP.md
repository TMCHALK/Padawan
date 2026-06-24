# Padawan Roadmap

The vision: collect customer insurance risk data, push it into any insurance
document, transfer data via APIs, compare quotes, integrate with Gmail + CRM, and
deliver coverage analysis — for one broker first, shareable with a team later.

This is delivered in phases. The autonomous build loop works the ordered tasks in
`BACKLOG.md`; this file is the high-level map.

## Phase 1 — Secure foundation ✅ (initial cut)
Risk-data + client database with the security baseline for real PII.
- Org / user / role model + auth (multi-tenant sharing foundation).
- Encrypted client records, structured risk profiles, policies, coverage items.
- Org-scoped RBAC + immutable audit log on every client-data access.
- Client intake, searchable list, and detail views.
- CI gates (lint, typecheck, unit, e2e) + autonomous loop setup.

## Phase 2 — Document generation
Map stored risk data → fillable PDFs / ACORD-style forms (`pdf-lib`).
"Transfer that data into any insurance doc."

## Phase 3 — Integrations (Gmail + CRM)
Two-way HubSpot contact/deal sync; Gmail thread linking and draft generation;
attach communications to client records. (HubSpot/Gmail are already connected via
this environment's MCP servers — build the in-app OAuth equivalents.)

**Shipped early:** a **sales pipeline tracker** (`/pipeline`) that "mostly auto-updates
through Gmail". A drag-and-drop board moves deals through qualified → quoting → proposed
→ won / lost / circle back, with deal value / probability / next action and a summed
value per stage (open-pipeline sizing, not booked revenue). The connector auto-advances
in-progress stages and *suggests* outcomes (the broker confirms — placement decisions
stay human). The ingestion seam (`POST /api/pipeline/gmail-sync`) is connector-driven
today; the in-app Gmail OAuth poller will call the same path. See `docs/PIPELINE_GMAIL.md`.

## Phase 4 — Quote comparison
Normalize carrier quotes into a side-by-side comparison. Start with manual / CSV
import and HubSpot Quote objects; add carrier rating APIs where access exists.

## Phase 5 — Coverage analysis
Gap and over-insurance detection, risk scoring, and recommendations over the risk
schema.

## Phase 6 — Sharing & compliance hardening
Member invitations, granular per-client access, audit reporting, data retention,
and consumer-privacy export/delete. Formal compliance review before onboarding
real clients (GLBA / state insurance regulations; HIPAA if health data).

## Known external constraints
- Carrier rating APIs and ACORD form licensing often require partnerships/agreements.
- Hosting real PII carries legal obligations — the baseline is a start, not a
  substitute for a compliance review.
