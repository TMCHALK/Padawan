"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signIn } from "@/lib/auth";
import { registerUserAndOrg, SignUpError } from "@/lib/accounts";
import { createClient } from "@/lib/clients";
import { requireSession } from "@/lib/session";
import { clientInputSchema, signUpSchema } from "@/lib/validation";

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
