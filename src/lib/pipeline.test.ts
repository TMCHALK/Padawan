import { describe, expect, it } from "vitest";
import { PipelineStage } from "@prisma/client";
import {
  applyEmailActivity,
  dealRevenue,
  detectSignal,
  isClosedStage,
  isInProgressStage,
  isOutcomeStage,
  summarizeGoals,
  summarizePipeline,
  type DealActivityState,
} from "@/lib/pipeline";

function state(over: Partial<DealActivityState> = {}): DealActivityState {
  return {
    stage: PipelineStage.QUALIFIED,
    lastActivityAt: null,
    lastSignal: null,
    suggestedStage: null,
    ...over,
  };
}

const T1 = new Date("2026-06-01T10:00:00Z");
const T2 = new Date("2026-06-02T10:00:00Z");
const T0 = new Date("2026-05-01T10:00:00Z");

describe("stage classification", () => {
  it("knows in-progress vs outcome stages", () => {
    expect(isInProgressStage(PipelineStage.QUALIFIED)).toBe(true);
    expect(isInProgressStage(PipelineStage.PROPOSED)).toBe(true);
    expect(isInProgressStage(PipelineStage.WON)).toBe(false);
    expect(isOutcomeStage(PipelineStage.WON)).toBe(true);
    expect(isOutcomeStage(PipelineStage.CIRCLE_BACK)).toBe(true);
    expect(isOutcomeStage(PipelineStage.QUOTING)).toBe(false);
  });

  it("treats only WON/LOST as closed", () => {
    expect(isClosedStage(PipelineStage.WON)).toBe(true);
    expect(isClosedStage(PipelineStage.LOST)).toBe(true);
    expect(isClosedStage(PipelineStage.CIRCLE_BACK)).toBe(false);
    expect(isClosedStage(PipelineStage.QUALIFIED)).toBe(false);
  });
});

describe("detectSignal", () => {
  it("detects a quote being sent", () => {
    expect(detectSignal("Your quote attached", "")).toEqual({
      signal: "quote_sent",
      stage: PipelineStage.QUOTING,
    });
  });

  it("detects a proposal being sent", () => {
    expect(detectSignal("Re: coverage", "Please see our proposal for your renewal")).toEqual(
      { signal: "proposal_sent", stage: PipelineStage.PROPOSED },
    );
  });

  it("detects win/bind language", () => {
    expect(detectSignal("Go ahead and bind it", "")?.stage).toBe(PipelineStage.WON);
  });

  it("detects loss language", () => {
    expect(detectSignal("We're going with another broker", "")?.stage).toBe(
      PipelineStage.LOST,
    );
  });

  it("detects circle-back language", () => {
    expect(detectSignal("Let's circle back next quarter", "")?.stage).toBe(
      PipelineStage.CIRCLE_BACK,
    );
  });

  it("prioritizes an outcome over a progress keyword in the same email", () => {
    // Mentions "proposal" but the decision is a loss — must read as LOST.
    const sig = detectSignal("Re: our proposal", "Thanks, but we're going with another broker");
    expect(sig?.stage).toBe(PipelineStage.LOST);
  });

  it("is case-insensitive and searches subject + snippet together", () => {
    expect(detectSignal("QUOTE ATTACHED", "")?.signal).toBe("quote_sent");
    expect(detectSignal("hello", "here is your QUOTE for your review")?.signal).toBe(
      "quote_sent",
    );
  });

  it("returns null for an email with no recognizable signal", () => {
    expect(detectSignal("Quick question about my deductible", "Can we chat?")).toBeNull();
  });
});

describe("applyEmailActivity — activity timestamp", () => {
  it("sets lastActivityAt from a first event", () => {
    const out = applyEmailActivity(state(), {
      subject: "hi",
      snippet: "",
      occurredAt: T1,
    });
    expect(out.lastActivityAt).toEqual(T1);
    expect(out.changed).toBe(true);
  });

  it("moves the clock forward but never backward", () => {
    const forward = applyEmailActivity(state({ lastActivityAt: T1 }), {
      subject: "hi",
      snippet: "",
      occurredAt: T2,
    });
    expect(forward.lastActivityAt).toEqual(T2);

    const backward = applyEmailActivity(state({ lastActivityAt: T1 }), {
      subject: "hi",
      snippet: "",
      occurredAt: T0,
    });
    expect(backward.lastActivityAt).toEqual(T1);
  });

  it("a no-signal email bumps activity but leaves stage/signal/suggestion alone", () => {
    const out = applyEmailActivity(
      state({ stage: PipelineStage.QUOTING, lastSignal: "quote_sent" }),
      { subject: "thanks!", snippet: "appreciate the call", occurredAt: T1 },
    );
    expect(out.stage).toBe(PipelineStage.QUOTING);
    expect(out.lastSignal).toBe("quote_sent");
    expect(out.suggestedStage).toBeNull();
    expect(out.advanced).toBe(false);
    expect(out.changed).toBe(true); // activity did change
  });
});

describe("applyEmailActivity — forward-only auto-advance", () => {
  it("advances QUALIFIED -> QUOTING on a quote signal", () => {
    const out = applyEmailActivity(state(), {
      subject: "Your quote attached",
      snippet: "",
      occurredAt: T1,
    });
    expect(out.stage).toBe(PipelineStage.QUOTING);
    expect(out.advanced).toBe(true);
    expect(out.lastSignal).toBe("quote_sent");
  });

  it("advances QUOTING -> PROPOSED on a proposal signal", () => {
    const out = applyEmailActivity(state({ stage: PipelineStage.QUOTING }), {
      subject: "Our proposal attached",
      snippet: "",
      occurredAt: T1,
    });
    expect(out.stage).toBe(PipelineStage.PROPOSED);
    expect(out.advanced).toBe(true);
  });

  it("never moves a stage backward (PROPOSED stays on a later quote email)", () => {
    const out = applyEmailActivity(state({ stage: PipelineStage.PROPOSED }), {
      subject: "Updated quote attached",
      snippet: "",
      occurredAt: T1,
    });
    expect(out.stage).toBe(PipelineStage.PROPOSED);
    expect(out.advanced).toBe(false);
    expect(out.lastSignal).toBe("quote_sent"); // signal still recorded
  });

  it("re-enters a parked CIRCLE_BACK deal when a fresh quote arrives", () => {
    const out = applyEmailActivity(state({ stage: PipelineStage.CIRCLE_BACK }), {
      subject: "Here's your quote",
      snippet: "",
      occurredAt: T1,
    });
    expect(out.stage).toBe(PipelineStage.QUOTING);
    expect(out.advanced).toBe(true);
  });
});

describe("applyEmailActivity — outcomes are suggested, never auto-set", () => {
  it("suggests WON instead of moving on a bind email", () => {
    const out = applyEmailActivity(state({ stage: PipelineStage.PROPOSED }), {
      subject: "Go ahead and bind it",
      snippet: "",
      occurredAt: T1,
    });
    expect(out.stage).toBe(PipelineStage.PROPOSED); // unchanged
    expect(out.advanced).toBe(false);
    expect(out.suggestedStage).toBe(PipelineStage.WON);
    expect(out.raisedSuggestion).toBe(PipelineStage.WON);
    expect(out.lastSignal).toBe("won");
  });

  it("suggests LOST instead of moving", () => {
    const out = applyEmailActivity(state({ stage: PipelineStage.PROPOSED }), {
      subject: "We're going with another broker",
      snippet: "",
      occurredAt: T1,
    });
    expect(out.stage).toBe(PipelineStage.PROPOSED);
    expect(out.suggestedStage).toBe(PipelineStage.LOST);
  });

  it("does not re-raise a suggestion the deal already carries", () => {
    const out = applyEmailActivity(
      state({ stage: PipelineStage.PROPOSED, suggestedStage: PipelineStage.WON }),
      { subject: "ready to bind", snippet: "", occurredAt: T1 },
    );
    expect(out.suggestedStage).toBe(PipelineStage.WON);
    expect(out.raisedSuggestion).toBeNull(); // not newly raised
  });

  it("freezes a closed (WON) deal — no advance, no new suggestion", () => {
    const out = applyEmailActivity(state({ stage: PipelineStage.WON }), {
      subject: "actually we're going with another broker",
      snippet: "",
      occurredAt: T1,
    });
    expect(out.stage).toBe(PipelineStage.WON);
    expect(out.suggestedStage).toBeNull();
    expect(out.lastActivityAt).toEqual(T1); // activity still recorded
  });

  it("clears a stale suggestion when the deal legitimately advances", () => {
    const out = applyEmailActivity(
      state({ stage: PipelineStage.QUALIFIED, suggestedStage: PipelineStage.LOST }),
      { subject: "Your quote attached", snippet: "", occurredAt: T1 },
    );
    expect(out.stage).toBe(PipelineStage.QUOTING);
    expect(out.suggestedStage).toBeNull();
  });
});

describe("dealRevenue", () => {
  it("computes premium × commission% rounded to whole dollars", () => {
    expect(dealRevenue("10000", "12")).toBe(1200);
    expect(dealRevenue(8500, 12)).toBe(1020);
    expect(dealRevenue("10000", "12.5")).toBe(1250);
    expect(dealRevenue("1000", "12.34")).toBe(123); // 123.4 -> 123
  });

  it("returns 0 when premium or rate is missing/garbage", () => {
    expect(dealRevenue(null, 12)).toBe(0);
    expect(dealRevenue("10000", null)).toBe(0);
    expect(dealRevenue("abc", "12")).toBe(0);
  });
});

describe("summarizePipeline", () => {
  it("counts totals, open deals, per-stage, revenue per stage, and pending suggestions", () => {
    const summary = summarizePipeline([
      { stage: PipelineStage.QUALIFIED, suggestedStage: null, revenue: 1000 },
      { stage: PipelineStage.QUALIFIED, suggestedStage: null, revenue: 500 },
      { stage: PipelineStage.QUOTING, suggestedStage: null, revenue: 2000 },
      { stage: PipelineStage.PROPOSED, suggestedStage: PipelineStage.WON, revenue: 3000 },
      { stage: PipelineStage.WON, suggestedStage: null, revenue: 9999 },
      { stage: PipelineStage.LOST, suggestedStage: null, revenue: 4444 },
      { stage: PipelineStage.CIRCLE_BACK, suggestedStage: null, revenue: null },
    ]);

    expect(summary.total).toBe(7);
    expect(summary.open).toBe(5); // all but WON + LOST
    expect(summary.pendingSuggestions).toBe(1);
    expect(summary.countByStage[PipelineStage.QUALIFIED]).toBe(2);
    expect(summary.revenueByStage[PipelineStage.QUALIFIED]).toBe(1500);
    expect(summary.revenueByStage[PipelineStage.QUOTING]).toBe(2000);
    expect(summary.revenueByStage[PipelineStage.WON]).toBe(9999);
    // open revenue excludes WON (9999) and LOST (4444): 1500 + 2000 + 3000 + 0
    expect(summary.openRevenue).toBe(6500);
  });

  it("treats missing/garbage revenue as zero and zero-fills empty pipelines", () => {
    const summary = summarizePipeline([
      { stage: PipelineStage.QUOTING, suggestedStage: null, revenue: "not-a-number" },
    ]);
    expect(summary.revenueByStage[PipelineStage.QUOTING]).toBe(0);

    const empty = summarizePipeline([]);
    expect(empty.total).toBe(0);
    expect(empty.openRevenue).toBe(0);
    expect(empty.revenueByStage[PipelineStage.PROPOSED]).toBe(0);
  });
});

describe("summarizeGoals", () => {
  // Mid-Q2: June 15, 2026. Month = June, quarter = Apr–Jun, year = 2026.
  const now = new Date(2026, 5, 15);
  const goals = { monthly: 20000, quarterly: 50000, annual: 200000 };

  it("buckets won revenue into month / quarter / year and computes % of goal", () => {
    const summary = summarizeGoals(now, goals, [
      { amount: 10000, wonAt: new Date(2026, 5, 3) }, // this month
      { amount: 5000, wonAt: new Date(2026, 4, 20) }, // this quarter, not month (May)
      { amount: 8000, wonAt: new Date(2026, 1, 10) }, // this year, not quarter (Feb)
      { amount: 9999, wonAt: new Date(2025, 11, 31) }, // last year — excluded everywhere
    ]);

    expect(summary.month.won).toBe(10000);
    expect(summary.month.pct).toBe(50); // 10000 / 20000
    expect(summary.quarter.won).toBe(15000); // 10000 + 5000
    expect(summary.quarter.pct).toBe(30); // 15000 / 50000
    expect(summary.year.won).toBe(23000); // 10000 + 5000 + 8000
    expect(summary.year.pct).toBe(12); // round(23000 / 200000 * 100)
  });

  it("returns null percentages when a goal is unset or zero, but still sums won", () => {
    const summary = summarizeGoals(
      now,
      { monthly: null, quarterly: 0, annual: 100000 },
      [{ amount: 4000, wonAt: new Date(2026, 5, 1) }],
    );
    expect(summary.month.goal).toBeNull();
    expect(summary.month.pct).toBeNull();
    expect(summary.month.won).toBe(4000);
    expect(summary.quarter.pct).toBeNull(); // zero goal → no divide
    expect(summary.year.pct).toBe(4);
  });
});
