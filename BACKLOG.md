# Padawan Backlog

Ordered, unblocked-first. The autonomous loop picks the **top unchecked item**,
implements it on a branch, and opens a PR. Keep items small enough to ship in one
loop iteration. Move completed items to the bottom and check them off.

## Now (top of stack)
- [ ] **Risk profile UI**: add/edit `RiskProfile` records on the client detail page
      (line-of-business select + line-specific attributes), via a `riskProfiles`
      service mirroring `src/lib/clients.ts` (RBAC + audit).
- [ ] **Edit & status-change client** (UPDATE path + audit), with VIEWER blocked.
- [ ] **Member invitations**: invite a user to the org with a role; accept flow.
- [ ] **Proper Prisma migrations**: replace `db push` with a committed initial
      migration and switch CI to `migrate deploy`.
- [ ] **Audit log viewer** (OWNER-only) for an org.

## Next
- [ ] Policy + coverage CRUD on the client detail page.
- [ ] PDF/ACORD document generation from a client's stored data (`pdf-lib`).
- [ ] HubSpot contact sync (create/update on client save; store `hubspotContactId`).
- [ ] Gmail: link threads to a client and draft outreach.

## Later
- [ ] Quote import (CSV) + comparison view.
- [ ] Coverage-gap analysis + risk scoring.
- [ ] Per-client access controls; data retention & export/delete.

## Done
- [x] Phase 1 foundation: auth, org/RBAC, encrypted clients, audit log, client
      intake/list/detail, CI, autonomous loop scaffold.
