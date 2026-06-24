# Sales pipeline + Gmail auto-update

The pipeline tracks **what's in flight, where, and how big**. Each deal carries an
estimated value, a rough close probability, and a next action, and sits in one stage.
The board is a drag-and-drop kanban; each column shows its deal count and the **summed
value** of the deals in it ("total qualified / quoting / proposed / won …"). The value
is **open-pipeline sizing, not booked revenue** — it answers "how much is in play",
deliberately not won/lost revenue accounting. Stages:

| Stage         | Meaning                                              | Auto-set by Gmail?        |
| ------------- | ---------------------------------------------------- | ------------------------- |
| `QUALIFIED`   | A real opportunity, not yet quoted                   | —                         |
| `QUOTING`     | A quote has gone out / is being worked               | ✅ auto-advance            |
| `PROPOSED`    | A proposal / recommendation has gone out             | ✅ auto-advance            |
| `WON`         | Bound — Tyler's call                                 | ⚠️ suggested only          |
| `LOST`        | Went elsewhere / declined — Tyler's call             | ⚠️ suggested only          |
| `CIRCLE_BACK` | Parked, revisit later — Tyler's call                 | ⚠️ suggested only          |

## Why outcomes are only *suggested*

Per `CLAUDE.md`, Padawan moves and organizes data; it does **not** make placement
decisions. "A quote went out" and "a proposal went out" are observable facts, so the
connector may auto-advance the in-progress stages. But WON / LOST / CIRCLE_BACK reflect
licensed judgment about a placement, so the engine never sets them — it records a
`suggestedStage` that Tyler confirms with one click on the board. Auto-advance is also
**forward-only**: a later quote email never drags a `PROPOSED` deal backwards, and a
closed (WON/LOST) deal is frozen.

All of this lives in the pure, fully-tested engine `src/lib/pipeline.ts`
(`detectSignal`, `applyEmailActivity`, `summarizePipeline`) — no I/O, so the rules are
exhaustively unit-tested in `src/lib/pipeline.test.ts`.

## How email matches a deal

A deal stores the counterparty's email **encrypted** (`counterpartyEmailEnc`, for
display) plus a keyed HMAC **fingerprint** (`counterpartyEmailHash`, for matching) —
the raw address is never stored in the clear (`src/lib/crypto.ts#hashEmail`). Inbound
mail matches a deal by its linked Gmail `threadId` first, then by the sender
fingerprint (and the thread id is linked on first match, so it's cheap thereafter).

## The ingestion seam

`POST /api/pipeline/gmail-sync` (authenticated) accepts a batch of email events and
folds each into the matching deal via the audited service `ingestGmailEvents`:

```jsonc
{
  "events": [
    {
      "threadId": "thread-ada-001",      // required — primary match key
      "from": "ada@example.com",         // fallback match (fingerprinted server-side)
      "subject": "Your quote attached",
      "snippet": "Here is your quote for review…",
      "occurredAt": "2026-06-23T15:04:00Z"
    }
  ]
}
```

Response: `{ matched, advanced, suggestionsRaised, unmatched }`.

Deals are **never auto-created** from unrecognized mail — a deal must exist first, so
the board stays signal-rich rather than full of noise. Unmatched events are counted and
returned so the caller can decide what to do.

## What drives it today vs. later

- **Today:** the environment's **Gmail connector (MCP)** is the watcher. It reads the
  relevant threads and posts batches to the sync endpoint, so the board "mostly
  auto-updates."
- **Phase 3 (follow-up):** in-app Gmail OAuth + a server-side poller that calls the same
  `ingestGmailEvents` path on a schedule. The seam is identical, so no engine changes are
  needed — only the source of the events.
