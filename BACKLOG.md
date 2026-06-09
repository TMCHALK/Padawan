# Padawan Backlog

Ordered, unblocked-first. The autonomous loop picks the **top unchecked item**,
implements it on a branch, and opens a CI-gated PR. Keep items small enough to
ship in one loop iteration. Move completed items to the bottom and check them off.

## Now (top of stack)
- [ ] **Portfolio data summary** on the client page — descriptive only
      (total premium, policy counts by status, coverage/risk-line counts).
- [ ] **Edit / delete policy** and delete risk profile (CRUD completeness).

## Next
- [ ] HubSpot contact sync (create/update on client save; store `hubspotContactId`).
      HubSpot is already connected in this environment.
- [ ] Gmail: link threads to a client and draft outreach (draft only; never send
      without Tyler's explicit go).
- [ ] ACORD-form-shaped submission output (needs real form templates/licensing —
      flagged for Tyler).

## Later (deferred per Tyler: single-user for now)
- [ ] Member invitations: invite a user to the org with a role; accept flow.
- [ ] Per-client access controls; data retention & export/delete.
- [ ] Quote import (CSV) + comparison view.

## Done
- [x] Edit an existing risk profile (UPDATE + audit). (PR #7)
- [x] Policy + coverage line-item capture, included in the submission PDF.
      Verified live (PDF contains the captured policy/coverage). (PR #6)
- [x] Risk Submission Summary PDF — first end-to-end output (capture risk data →
      download populated PDF). Verified live. (PR #5)
- [x] Edit & status-change client (UPDATE + audit). (PR #4)
- [x] OWNER-only audit log viewer. (PR #3)
- [x] Proper Prisma migrations (committed initial migration; CI uses `migrate
      deploy`). (PR #2)
- [x] Risk-profile capture — service (RBAC + audit), validation, server action,
      client-detail UI (add + view). (PR #1)
- [x] Phase 1 foundation: auth, org/RBAC, encrypted clients, audit log, client
      intake/list/detail, CI, autonomous loop scaffold.
