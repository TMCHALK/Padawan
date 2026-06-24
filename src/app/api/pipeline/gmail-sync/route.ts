import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ingestGmailEvents } from "@/lib/deals";
import { gmailSyncSchema } from "@/lib/validation";

/**
 * POST /api/pipeline/gmail-sync
 *
 * The Gmail ingestion seam that makes the pipeline "mostly auto-update". A Gmail
 * watcher posts a batch of email events:
 *
 *   { "events": [ { "threadId", "from", "subject", "snippet", "occurredAt" }, ... ] }
 *
 * and each is folded into the matching deal by the pure pipeline engine (in-progress
 * stages auto-advance; won/lost/circle-back are only suggested). Today this is driven
 * by the environment's Gmail connector; in-app Gmail OAuth polling is the Phase 3
 * follow-up (see docs/PIPELINE_GMAIL.md). The write path is the same audited service
 * (ingestGmailEvents), so every change is authorized and logged.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = gmailSyncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 422 },
    );
  }

  try {
    const result = await ingestGmailEvents(
      session.user.id,
      session.user.organizationId,
      parsed.data.events,
    );
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
