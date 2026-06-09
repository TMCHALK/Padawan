import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export interface ActiveSession {
  userId: string;
  organizationId: string;
  email: string;
}

/**
 * Resolves the current session for a server component, redirecting to sign-in if
 * the user is not authenticated or has no active organization.
 */
export async function requireSession(): Promise<ActiveSession> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }
  if (!session.user.organizationId) {
    // Authenticated but no org — should not happen post sign-up, but guard anyway.
    redirect("/sign-in?error=no-organization");
  }
  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    email: session.user.email ?? "",
  };
}
