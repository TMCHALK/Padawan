import { PipelineStage } from "@prisma/client";

/**
 * Pure sales-pipeline logic: stage vocabulary, the Gmail signal-detection rules,
 * how email activity moves (or merely *suggests* moving) a deal, and the descriptive
 * roll-up shown on the board.
 *
 * First principles (see CLAUDE.md): this organizes and moves data. The connector may
 * auto-advance a deal through the in-progress stages because "a quote went out" / "a
 * proposal went out" are observable facts, not decisions. But WON / LOST / CIRCLE_BACK
 * are *outcomes* — they reflect Tyler's licensed judgment about a placement — so the
 * engine never sets them automatically; it only raises a suggestion he confirms. The
 * pipeline also deliberately carries NO premium/revenue: it answers "what's in flight
 * and where", not "how much money".
 *
 * Everything here is pure (no I/O, no Prisma) so the rules are exhaustively testable.
 */

/** Human-readable labels for each stage, for selects and the board. */
export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  [PipelineStage.QUALIFIED]: "Qualified",
  [PipelineStage.QUOTING]: "Quoting",
  [PipelineStage.PROPOSED]: "Proposed",
  [PipelineStage.WON]: "Won",
  [PipelineStage.LOST]: "Lost",
  [PipelineStage.CIRCLE_BACK]: "Circle back",
};

/** Left-to-right order the board renders stages in. */
export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  PipelineStage.QUALIFIED,
  PipelineStage.QUOTING,
  PipelineStage.PROPOSED,
  PipelineStage.WON,
  PipelineStage.LOST,
  PipelineStage.CIRCLE_BACK,
];

/**
 * The forward progression the connector may auto-advance through. Outcome stages are
 * deliberately absent — they are never auto-set.
 */
const IN_PROGRESS_ORDER: PipelineStage[] = [
  PipelineStage.QUALIFIED,
  PipelineStage.QUOTING,
  PipelineStage.PROPOSED,
];

/** Closed outcomes — excluded from the "open pipeline" count and frozen to activity. */
const CLOSED_STAGES: PipelineStage[] = [PipelineStage.WON, PipelineStage.LOST];

export function isInProgressStage(stage: PipelineStage): boolean {
  return IN_PROGRESS_ORDER.includes(stage);
}

export function isClosedStage(stage: PipelineStage): boolean {
  return CLOSED_STAGES.includes(stage);
}

/** True for stages the connector may *suggest* but must never auto-set. */
export function isOutcomeStage(stage: PipelineStage): boolean {
  return !isInProgressStage(stage);
}

// --- Gmail signal detection ----------------------------------------------------

export interface EmailSignal {
  /** Stable label stored on the deal, e.g. "proposal_sent". */
  signal: string;
  /** The stage this signal points at (auto-advanced if in-progress, else suggested). */
  stage: PipelineStage;
}

interface SignalRule extends EmailSignal {
  /** Lowercase substrings; any match fires the rule. */
  patterns: string[];
}

/**
 * Ordered rules — first match wins. Outcome signals are checked *before* progress
 * signals so "Re: our proposal — we're going with another broker" reads as LOST, not
 * PROPOSED. Patterns are intentionally conservative: a missed signal just means a deal
 * isn't auto-moved (the broker still does it), whereas a false WON/LOST would be worse.
 */
const SIGNAL_RULES: SignalRule[] = [
  {
    signal: "won",
    stage: PipelineStage.WON,
    patterns: [
      "go ahead and bind",
      "please bind",
      "let's bind",
      "ready to bind",
      "we're bound",
      "we are bound",
      "policy issued",
      "accepted your proposal",
      "accept your proposal",
      "signed application",
      "bind coverage",
    ],
  },
  {
    signal: "lost",
    stage: PipelineStage.LOST,
    patterns: [
      "going with another",
      "went with another",
      "going a different direction",
      "decided to go with",
      "chose another",
      "we'll pass",
      "we will pass",
      "not moving forward",
      "no longer interested",
      "going to decline",
      "we are declining",
      "staying with our current",
      "staying with their current",
    ],
  },
  {
    signal: "circle_back",
    stage: PipelineStage.CIRCLE_BACK,
    patterns: [
      "circle back",
      "circle-back",
      "touch base later",
      "reach back out",
      "check back",
      "follow up later",
      "not right now",
      "revisit next",
      "reach out closer to",
      "keep us in mind",
      "renewal isn't until",
      "renewal is not until",
    ],
  },
  {
    signal: "proposal_sent",
    stage: PipelineStage.PROPOSED,
    patterns: [
      "proposal attached",
      "attached proposal",
      "our proposal",
      "here is our proposal",
      "here's our proposal",
      "proposal for your",
      "presentation attached",
      "recommendation attached",
      "coverage options",
      "options for your review",
    ],
  },
  {
    signal: "quote_sent",
    stage: PipelineStage.QUOTING,
    patterns: [
      "quote attached",
      "attached quote",
      "your quote",
      "here is your quote",
      "here's your quote",
      "quotation",
      "premium indication",
      "indication of premium",
      "we've rated",
      "we have rated",
      "quote for your",
    ],
  },
];

/** Detects the strongest signal in an email's subject + snippet, or null if none. */
export function detectSignal(
  subject: string | null | undefined,
  snippet: string | null | undefined,
): EmailSignal | null {
  const hay = `${subject ?? ""} ${snippet ?? ""}`.toLowerCase();
  for (const rule of SIGNAL_RULES) {
    if (rule.patterns.some((p) => hay.includes(p))) {
      return { signal: rule.signal, stage: rule.stage };
    }
  }
  return null;
}

// --- Applying email activity to a deal -----------------------------------------

/** The mutable activity-bearing subset of a Deal the engine reasons over. */
export interface DealActivityState {
  stage: PipelineStage;
  lastActivityAt: Date | null;
  lastSignal: string | null;
  suggestedStage: PipelineStage | null;
}

export interface EmailEvent {
  subject: string;
  snippet: string;
  /** When the email happened — the activity clock only ever moves forward. */
  occurredAt: Date;
}

export interface ActivityOutcome extends DealActivityState {
  /** True if any field changed versus the input state. */
  changed: boolean;
  /** True if the stage was auto-advanced (in-progress only). */
  advanced: boolean;
  /** A newly-raised outcome suggestion awaiting confirmation, or null. */
  raisedSuggestion: PipelineStage | null;
}

/** Can `current` auto-advance to in-progress `target`? Forward-only; never from closed. */
function canAutoAdvance(current: PipelineStage, target: PipelineStage): boolean {
  if (isClosedStage(current)) return false; // won/lost are final
  if (current === PipelineStage.CIRCLE_BACK) return true; // parked deal re-enters
  return IN_PROGRESS_ORDER.indexOf(target) > IN_PROGRESS_ORDER.indexOf(current);
}

/**
 * Folds one email event into a deal's activity state, returning the new state plus
 * what happened. Pure — the service layer persists the result and writes the audit.
 *
 * Rules:
 *  - lastActivityAt always moves to the most recent of (existing, event) — even a
 *    plain reply with no signal counts as activity.
 *  - An in-progress signal (quote/proposal) auto-advances the stage, forward-only,
 *    and clears any stale suggestion.
 *  - An outcome signal (won/lost/circle_back) NEVER moves the stage; it records a
 *    suggestion for the broker to confirm (unless the deal is already there or closed).
 *  - A no-signal email leaves stage/signal/suggestion untouched.
 */
export function applyEmailActivity(
  current: DealActivityState,
  event: EmailEvent,
): ActivityOutcome {
  const next: DealActivityState = { ...current };

  if (!current.lastActivityAt || event.occurredAt > current.lastActivityAt) {
    next.lastActivityAt = event.occurredAt;
  }

  const detected = detectSignal(event.subject, event.snippet);
  if (detected) {
    next.lastSignal = detected.signal;
    if (isInProgressStage(detected.stage)) {
      if (canAutoAdvance(current.stage, detected.stage)) {
        next.stage = detected.stage;
        next.suggestedStage = null;
      }
    } else if (current.stage !== detected.stage && !isClosedStage(current.stage)) {
      next.suggestedStage = detected.stage;
    }
  }

  const advanced = next.stage !== current.stage;
  const raisedSuggestion =
    next.suggestedStage !== current.suggestedStage ? next.suggestedStage : null;
  const changed =
    advanced ||
    next.lastActivityAt !== current.lastActivityAt ||
    next.lastSignal !== current.lastSignal ||
    next.suggestedStage !== current.suggestedStage;

  return { ...next, changed, advanced, raisedSuggestion };
}

// --- Descriptive roll-up -------------------------------------------------------

export interface PipelineSummary {
  /** Every deal, regardless of stage. */
  total: number;
  /** Deals still in play — everything except WON / LOST. */
  open: number;
  /** Count of deals in each stage (all stages present, zero-filled). */
  countByStage: Record<PipelineStage, number>;
  /** Deals carrying a Gmail-raised outcome suggestion the broker hasn't confirmed. */
  pendingSuggestions: number;
}

/**
 * Pure, descriptive roll-up of the pipeline — counts only, no revenue. Tells Tyler
 * "what's in flight and where", which is the whole ask.
 */
export function summarizePipeline(
  deals: { stage: PipelineStage; suggestedStage: PipelineStage | null }[],
): PipelineSummary {
  const countByStage = PIPELINE_STAGE_ORDER.reduce(
    (acc, stage) => {
      acc[stage] = 0;
      return acc;
    },
    {} as Record<PipelineStage, number>,
  );

  let open = 0;
  let pendingSuggestions = 0;
  for (const deal of deals) {
    countByStage[deal.stage] += 1;
    if (!isClosedStage(deal.stage)) open += 1;
    if (deal.suggestedStage) pendingSuggestions += 1;
  }

  return { total: deals.length, open, countByStage, pendingSuggestions };
}
