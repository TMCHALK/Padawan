import { z } from "zod";
import { ClientStatus, RiskLineOfBusiness } from "@prisma/client";

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
