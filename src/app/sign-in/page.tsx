import { SignInForm } from "@/components/AuthForms";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-semibold">Sign in to Padawan</h1>
      <p className="mb-6 text-sm text-white/60">
        Secure access to your client risk data.
      </p>
      <SignInForm />
    </main>
  );
}
