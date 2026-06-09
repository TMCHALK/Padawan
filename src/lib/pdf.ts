import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { DecryptedClient } from "@/lib/clients";
import type { RiskProfileView } from "@/lib/riskProfiles";
import type { PolicyView } from "@/lib/policies";
import { POLICY_STATUS_LABELS, RISK_LINE_LABELS } from "@/lib/validation";

/**
 * Renders a client's stored data into a "Risk Submission Summary" PDF.
 *
 * First principles: this MOVES and ORGANIZES already-captured data into a
 * document. It does not evaluate coverage, recommend limits, or make any
 * placement decision — those are Tyler's licensed judgment. The footer states
 * this explicitly so the artifact can't be mistaken for advice or a binding doc.
 */

const MARGIN = 50;
const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const INK = rgb(0.1, 0.12, 0.18);
const MUTED = rgb(0.4, 0.43, 0.5);
const RULE = rgb(0.8, 0.82, 0.86);

interface BuildInput {
  client: DecryptedClient;
  riskProfiles: RiskProfileView[];
  policies?: PolicyView[];
  organizationName: string;
  generatedBy: string;
}

function money(value: string | null): string {
  if (!value) return "—";
  const n = Number(value);
  return Number.isFinite(n) ? `$${n.toLocaleString()}` : value;
}

function isoDate(value: Date | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "—";
}

/** A tiny cursor-based layout helper so content flows down and paginates. */
class Layout {
  page: PDFPage;
  y: number;
  constructor(
    private doc: PDFDocument,
    private font: PDFFont,
    private bold: PDFFont,
  ) {
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  private ensure(space: number) {
    if (this.y - space < MARGIN + 40) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.y = PAGE_HEIGHT - MARGIN;
    }
  }

  text(value: string, opts: { size?: number; bold?: boolean; color?: typeof INK; indent?: number } = {}) {
    const size = opts.size ?? 11;
    this.ensure(size + 6);
    this.page.drawText(value, {
      x: MARGIN + (opts.indent ?? 0),
      y: this.y,
      size,
      font: opts.bold ? this.bold : this.font,
      color: opts.color ?? INK,
    });
    this.y -= size + 6;
  }

  /** A label/value row, used for client fields and risk attributes. */
  row(label: string, value: string) {
    const size = 11;
    this.ensure(size + 6);
    this.page.drawText(label, { x: MARGIN, y: this.y, size, font: this.bold, color: MUTED });
    this.page.drawText(value || "—", {
      x: MARGIN + 160,
      y: this.y,
      size,
      font: this.font,
      color: INK,
    });
    this.y -= size + 6;
  }

  rule() {
    this.ensure(12);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 1,
      color: RULE,
    });
    this.y -= 14;
  }

  space(amount = 8) {
    this.y -= amount;
  }
}

export async function buildSubmissionPdf(input: BuildInput): Promise<Uint8Array> {
  const { client, riskProfiles, organizationName, generatedBy } = input;
  const doc = await PDFDocument.create();
  doc.setTitle(`Risk Submission Summary — ${client.firstName} ${client.lastName}`);
  doc.setProducer("Padawan");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const L = new Layout(doc, font, bold);

  // Header
  L.text("Risk Submission Summary", { size: 20, bold: true });
  L.text(organizationName, { size: 11, color: MUTED });
  L.text(`Generated ${new Date().toISOString().slice(0, 10)} by ${generatedBy}`, {
    size: 9,
    color: MUTED,
  });
  L.space(6);
  L.rule();

  // Applicant / client
  L.text("Applicant", { size: 14, bold: true });
  L.space(2);
  L.row("Name", `${client.firstName} ${client.lastName}`);
  L.row("Status", client.status);
  L.row("Email", client.email ?? "");
  L.row("Phone", client.phone ?? "");
  L.row("Date of birth", client.dob ?? "");
  L.row("Address", client.address ?? "");
  L.space(6);
  L.rule();

  // Risk profiles
  L.text("Risk Profiles", { size: 14, bold: true });
  L.space(2);
  if (riskProfiles.length === 0) {
    L.text("No risk data captured.", { size: 11, color: MUTED });
  } else {
    for (const profile of riskProfiles) {
      L.space(4);
      L.text(RISK_LINE_LABELS[profile.lineOfBusiness], { size: 12, bold: true });
      const entries = Object.entries(profile.attributes);
      if (entries.length === 0) {
        L.text("No attributes recorded.", { size: 10, color: MUTED, indent: 10 });
      } else {
        for (const [k, v] of entries) {
          L.row(k, v);
        }
      }
      if (profile.notes) {
        L.text(`Notes: ${profile.notes}`, { size: 10, color: MUTED });
      }
    }
  }

  // Policies
  const policies = input.policies ?? [];
  L.space(6);
  L.rule();
  L.text("Policies", { size: 14, bold: true });
  L.space(2);
  if (policies.length === 0) {
    L.text("No policies recorded.", { size: 11, color: MUTED });
  } else {
    for (const policy of policies) {
      L.space(4);
      L.text(`${policy.carrier} — ${policy.policyNumber}`, { size: 12, bold: true });
      L.row("Line of business", RISK_LINE_LABELS[policy.lineOfBusiness]);
      L.row("Status", POLICY_STATUS_LABELS[policy.status]);
      L.row("Premium", money(policy.premium));
      L.row("Effective", isoDate(policy.effectiveDate));
      L.row("Expiration", isoDate(policy.expirationDate));
      for (const c of policy.coverageItems) {
        const parts = [
          c.limit ? `limit ${money(c.limit)}` : null,
          c.deductible ? `deductible ${money(c.deductible)}` : null,
        ].filter(Boolean);
        L.text(`• ${c.name}${parts.length ? ` (${parts.join(", ")})` : ""}`, {
          size: 10,
          color: MUTED,
          indent: 10,
        });
      }
    }
  }

  // Footer disclaimer on every page — keeps the artifact firmly a data summary.
  const disclaimer =
    "Data summary generated from captured records. Not coverage advice, a quote, or a binding document.";
  const pages = doc.getPages();
  for (const page of pages) {
    page.drawText(disclaimer, {
      x: MARGIN,
      y: MARGIN - 18,
      size: 8,
      font,
      color: MUTED,
      maxWidth: PAGE_WIDTH - MARGIN * 2,
    });
  }

  return doc.save();
}
