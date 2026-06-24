import { z } from "zod";
import {
  ClientStatus,
  PipelineStage,
  PolicyStatus,
  RiskLineOfBusiness,
} from "@prisma/client";

// --- Auth ---------------------------------------------------------------------

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  organizationName: z
    .string()
    .trim()
    .min(1, "Organization name is required")
    .max(120),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

// --- Client intake ------------------------------------------------------------

export const clientInputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(120),
  lastName: z.string().trim().min(1, "Last name is required").max(120),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(400).optional().or(z.literal("")),
  dob: z.string().trim().max(40).optional().or(z.literal("")),
  status: z.nativeEnum(ClientStatus).default(ClientStatus.PROSPECT),
});
export type ClientInput = z.infer<typeof clientInputSchema>;

// --- Risk profile -------------------------------------------------------------

export const riskProfileInputSchema = z.object({
  lineOfBusiness: z.nativeEnum(RiskLineOfBusiness),
  // Line-of-business attributes are validated structurally; specific schemas per
  // line of business are layered on in later phases.
  attributes: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type RiskProfileInput = z.infer<typeof riskProfileInputSchema>;

/** Human-readable labels for each line of business, for UI selects and display. */
export const RISK_LINE_LABELS: Record<RiskLineOfBusiness, string> = {
  [RiskLineOfBusiness.AUTO]: "Auto",
  [RiskLineOfBusiness.HOME]: "Home",
  [RiskLineOfBusiness.PROPERTY]: "Property",
  [RiskLineOfBusiness.LIABILITY]: "Liability",
  [RiskLineOfBusiness.LIFE]: "Life",
  [RiskLineOfBusiness.HEALTH]: "Health",
  [RiskLineOfBusiness.COMMERCIAL]: "Commercial",
  [RiskLineOfBusiness.OTHER]: "Other",
};

/**
 * Folds parallel key/value arrays from the attribute-capture form into a single
 * record, dropping rows with an empty key and trimming both sides. Last value
 * wins on duplicate keys. This keeps the data layer flexible (any line-specific
 * attribute) without imposing a fixed schema we'd have to decide on.
 */
export function parseAttributePairs(
  keys: string[],
  values: string[],
): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (let i = 0; i < keys.length; i++) {
    const key = (keys[i] ?? "").trim();
    if (!key) continue;
    attributes[key] = (values[i] ?? "").trim();
  }
  return attributes;
}

/** Builds a safe-to-display label from a name, avoiding storing full PII in the clear. */
export function buildDisplayName(firstName: string, lastName: string): string {
  const initial = firstName.trim().charAt(0).toUpperCase();
  return `${initial}. ${lastName.trim()}`;
}

// --- Policies & coverage ------------------------------------------------------

/** Human-readable labels for policy lifecycle status. */
export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  [PolicyStatus.QUOTED]: "Quoted",
  [PolicyStatus.BOUND]: "Bound",
  [PolicyStatus.ACTIVE]: "Active",
  [PolicyStatus.CANCELLED]: "Cancelled",
  [PolicyStatus.EXPIRED]: "Expired",
};

const coverageItemSchema = z.object({
  name: z.string().trim().min(1).max(160),
  limit: z.string().trim().max(40).optional().or(z.literal("")),
  deductible: z.string().trim().max(40).optional().or(z.literal("")),
});

export const policyInputSchema = z.object({
  carrier: z.string().trim().min(1, "Carrier is required").max(160),
  policyNumber: z.string().trim().min(1, "Policy number is required").max(120),
  lineOfBusiness: z.nativeEnum(RiskLineOfBusiness),
  premium: z.string().trim().max(40).optional().or(z.literal("")),
  effectiveDate: z.string().trim().max(40).optional().or(z.literal("")),
  expirationDate: z.string().trim().max(40).optional().or(z.literal("")),
  status: z.nativeEnum(PolicyStatus).default(PolicyStatus.QUOTED),
  coverages: z.array(coverageItemSchema).default([]),
});
export type PolicyInput = z.infer<typeof policyInputSchema>;

/**
 * Folds parallel coverage-row arrays from the form into a list, dropping rows with
 * an empty name. Mirrors parseAttributePairs — flexible capture, no fixed schema.
 */
export function parseCoverageRows(
  names: string[],
  limits: string[],
  deductibles: string[],
): { name: string; limit: string; deductible: string }[] {
  const rows: { name: string; limit: string; deductible: string }[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = (names[i] ?? "").trim();
    if (!name) continue;
    rows.push({
      name,
      limit: (limits[i] ?? "").trim(),
      deductible: (deductibles[i] ?? "").trim(),
    });
  }
  return rows;
}

/** Parses a money string ("1,250.00", "$1250") to a numeric string, or null. */
export function parseMoney(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? String(n) : null;
}

/** Parses a YYYY-MM-DD (or ISO) date string to a Date, or null if invalid. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// --- Sales pipeline -----------------------------------------------------------

/**
 * Deal intake. Deliberately captures NO premium/revenue — the pipeline tracks
 * "what's in flight and where", not money. `clientId` is optional so a fresh Gmail
 * prospect can be tracked before being entered as a full client; `counterpartyEmail`
 * is what the Gmail connector matches inbound mail against.
 */
export const dealInputSchema = z.object({
  name: z.string().trim().min(1, "Deal name is required").max(200),
  stage: z.nativeEnum(PipelineStage).default(PipelineStage.QUALIFIED),
  clientId: z.string().trim().min(1).max(40).optional().or(z.literal("")),
  counterpartyEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type DealInput = z.infer<typeof dealInputSchema>;

/** A single stage transition (manual move, or confirming a Gmail suggestion). */
export const dealStageSchema = z.object({
  stage: z.nativeEnum(PipelineStage),
});

/**
 * One inbound email event for the Gmail ingestion seam. The connector (or, later,
 * the in-app Gmail OAuth poller) posts a batch of these; the pipeline engine folds
 * each into the matching deal. No message body/PII beyond the snippet is required.
 */
export const gmailEventSchema = z.object({
  /** Gmail thread id — the primary key we match a deal on. */
  threadId: z.string().trim().min(1).max(120),
  /** Counterparty address (the other party on the thread), used as a fallback match. */
  from: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .optional()
    .or(z.literal("")),
  subject: z.string().trim().max(1000).optional().or(z.literal("")),
  snippet: z.string().trim().max(2000).optional().or(z.literal("")),
  /** ISO timestamp of the message; defaults to now if absent/unparseable. */
  occurredAt: z.string().trim().max(40).optional().or(z.literal("")),
});
export type GmailEventInput = z.infer<typeof gmailEventSchema>;

export const gmailSyncSchema = z.object({
  events: z.array(gmailEventSchema).max(500),
});
