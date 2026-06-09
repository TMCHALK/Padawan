# Autonomous Build Loop & Multi-Agent Orchestration

This is how to make Claude Code grind the roadmap on a schedule, safely, using
your weekly credits.

## The idea
`BACKLOG.md` is the source of truth. Each loop iteration: pick the top unchecked
item → explore → plan → implement → run checks → open a PR. CI is the safety net;
nothing merges to `main` until it's green and you approve.

## One iteration (what a run should do)
Run this prompt (or a saved slash command) in a Claude Code session:

> Read `BACKLOG.md` and take the top unchecked item under "Now". Follow
> `CLAUDE.md`. Implement it on a new branch `claude/<slug>`. Use an **Explore**
> subagent to find the relevant code, a **Plan** subagent to design the change,
> then implement it. Run `npm run lint && npm run typecheck && npm run test`.
> When green, commit, push, and open a PR. Check the item off in `BACKLOG.md`.

Multi-agent orchestration: the main session delegates fan-out search to the
**Explore** agent and design to the **Plan** agent, then does the edits itself —
so each run is itself a small multi-agent workflow.

## Running it on a schedule (use your credits weekly)
Use the `/loop` skill to repeat on an interval, e.g.:

```
/loop 30m <the prompt above>
```

This re-runs every 30 minutes, working down the backlog. Adjust the interval to
match your weekly credit budget. Stop with the loop's stop control.

## Guardrails (why this is safe to leave running)
- **Branch + PR per task; no auto-merge to `main`.** You (or `/code-review`)
  approve merges. Loosen to auto-merge-on-green later if you want more throughput.
- **CI must pass** (`.github/workflows/ci.yml`): lint, typecheck, unit, e2e.
- **`CLAUDE.md` security rules** are loaded every session: no secrets/PII, all PII
  encrypted, all client access via the audited service layer.
- **SessionStart hook** (`.claude/hooks/session-start.sh`) makes every fresh
  session able to run the checks immediately.

## Watching PRs
After a loop opens a PR, you can ask Claude Code to watch it and auto-fix CI
failures or respond to review comments, so the loop stays unblocked.

## Reviewing the work
Periodically run `/code-review` on open PRs, or review the diffs yourself. The
backlog + roadmap + CI history give you a clear audit trail of what the loop built.
