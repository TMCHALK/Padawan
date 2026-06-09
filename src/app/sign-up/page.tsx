import { SignUpForm } from "@/components/AuthForms";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-semibold">Create your workspace</h1>
      <p className="mb-6 text-sm text-white/60">
        Sets up your account and organization. You can invite others later.
      </p>
      <SignUpForm />
    </main>
  );
}
