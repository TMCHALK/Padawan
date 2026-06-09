"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signIn } from "@/lib/auth";
import { registerUserAndOrg, SignUpError } from "@/lib/accounts";
import { createClient, updateClient } from "@/lib/clients";
import { createRiskProfile } from "@/lib/riskProfiles";
import { createPolicy } from "@/lib/policies";
import { requireSession } from "@/lib/session";
import {
  clientInputSchema,
  parseAttributePairs,
  parseCoverageRows,
  policyInputSchema,
  riskProfileInputSchema,
  signUpSchema,
} from "@/lib/validation";

export interface FormState {
  error?: string;
}

/** Registers a new user + org, then signs them in and sends them to the dashboard. */
export async function signUpAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    organizationName: formData.get("organizationName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await registerUserAndOrg(parsed.data);
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/clients",
    });
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof SignUpError) return { error: err.message };
    return { error: "Could not create account. Please try again." };
  }
  return {};
}

/** Signs an existing user in with email + password. */
export async function signInAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/clients",
    });
  } catch (err) {
    unstable_rethrow(err);
    return { error: "Invalid email or password" };
  }
  return {};
}

/** Creates a client record from the intake form, then redirects to the list. */
export async function createClientAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, organizationId } = await requireSession();

  const parsed = clientInputSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    dob: formData.get("dob"),
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await createClient(userId, organizationId, parsed.data);
  } catch {
    return { error: "Could not save client. Please try again." };
  }

  revalidatePath("/clients");
  redirect("/clients");
}

/** Adds a structured risk profile to a client, then refreshes the detail page. */
export async function createRiskProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, organizationId } = await requireSession();

  const clientId = formData.get("clientId");
  if (typeof clientId !== "string" || !clientId) {
    return { error: "Missing client reference" };
  }

  const attributes = parseAttributePairs(
    formData.getAll("attrKey").map(String),
    formData.getAll("attrValue").map(String),
  );

  const parsed = riskProfileInputSchema.safeParse({
    lineOfBusiness: formData.get("lineOfBusiness"),
    attributes,
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await createRiskProfile(userId, organizationId, clientId, parsed.data);
  } catch {
    return { error: "Could not save risk profile. Please try again." };
  }

  revalidatePath(`/clients/${clientId}`);
  return {};
}

/** Updates an existing client record (incl. status), then redirects to its detail page. */
export async function updateClientAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, organizationId } = await requireSession();

  const clientId = formData.get("clientId");
  if (typeof clientId !== "string" || !clientId) {
    return { error: "Missing client reference" };
  }

  const parsed = clientInputSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    dob: formData.get("dob"),
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await updateClient(userId, organizationId, clientId, parsed.data);
  } catch (err) {
    unstable_rethrow(err);
    return { error: "Could not save client. Please try again." };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}

/** Adds a policy (with coverage line items) to a client, then refreshes the page. */
export async function createPolicyAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, organizationId } = await requireSession();

  const clientId = formData.get("clientId");
  if (typeof clientId !== "string" || !clientId) {
    return { error: "Missing client reference" };
  }

  const coverages = parseCoverageRows(
    formData.getAll("covName").map(String),
    formData.getAll("covLimit").map(String),
    formData.getAll("covDeductible").map(String),
  );

  const parsed = policyInputSchema.safeParse({
    carrier: formData.get("carrier"),
    policyNumber: formData.get("policyNumber"),
    lineOfBusiness: formData.get("lineOfBusiness"),
    premium: formData.get("premium") || "",
    effectiveDate: formData.get("effectiveDate") || "",
    expirationDate: formData.get("expirationDate") || "",
    status: formData.get("status") || undefined,
    coverages,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await createPolicy(userId, organizationId, clientId, parsed.data);
  } catch {
    return { error: "Could not save policy. Please try again." };
  }

  revalidatePath(`/clients/${clientId}`);
  return {};
}
