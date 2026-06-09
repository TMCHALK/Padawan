"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, signUpAction, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";

const initial: FormState = {};

const inputClass =
  "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400";
const labelClass = "mb-1 block text-sm text-white/70";

export function SignInForm() {
  const [state, action] = useActionState(signInAction, initial);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="email">
          Email
        </label>
        <input className={inputClass} id="email" name="email" type="email" required />
      </div>
      <div>
        <label className={labelClass} htmlFor="password">
          Password
        </label>
        <input
          className={inputClass}
          id="password"
          name="password"
          type="password"
          required
        />
      </div>
      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      <SubmitButton>Sign in</SubmitButton>
      <p className="text-sm text-white/60">
        No account?{" "}
        <Link className="text-indigo-300 hover:underline" href="/sign-up">
          Create one
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, initial);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="name">
          Your name
        </label>
        <input className={inputClass} id="name" name="name" required />
      </div>
      <div>
        <label className={labelClass} htmlFor="organizationName">
          Organization name
        </label>
        <input
          className={inputClass}
          id="organizationName"
          name="organizationName"
          required
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="email">
          Email
        </label>
        <input className={inputClass} id="email" name="email" type="email" required />
      </div>
      <div>
        <label className={labelClass} htmlFor="password">
          Password
        </label>
        <input
          className={inputClass}
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
        />
      </div>
      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      <SubmitButton>Create account</SubmitButton>
      <p className="text-sm text-white/60">
        Already have an account?{" "}
        <Link className="text-indigo-300 hover:underline" href="/sign-in">
          Sign in
        </Link>
      </p>
    </form>
  );
}
