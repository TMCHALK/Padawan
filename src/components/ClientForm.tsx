"use client";

import { useActionState } from "react";
import { createClientAction, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";

const initial: FormState = {};

const inputClass =
  "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400";
const labelClass = "mb-1 block text-sm text-white/70";

export function ClientForm() {
  const [state, action] = useActionState(createClientAction, initial);
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="firstName">
            First name
          </label>
          <input className={inputClass} id="firstName" name="firstName" required />
        </div>
        <div>
          <label className={labelClass} htmlFor="lastName">
            Last name
          </label>
          <input className={inputClass} id="lastName" name="lastName" required />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="email">
          Email
        </label>
        <input className={inputClass} id="email" name="email" type="email" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="phone">
            Phone
          </label>
          <input className={inputClass} id="phone" name="phone" />
        </div>
        <div>
          <label className={labelClass} htmlFor="dob">
            Date of birth
          </label>
          <input className={inputClass} id="dob" name="dob" placeholder="YYYY-MM-DD" />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="address">
          Address
        </label>
        <input className={inputClass} id="address" name="address" />
      </div>
      <div>
        <label className={labelClass} htmlFor="status">
          Status
        </label>
        <select className={inputClass} id="status" name="status" defaultValue="PROSPECT">
          <option value="PROSPECT">Prospect</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>
      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      <SubmitButton>Save client</SubmitButton>
    </form>
  );
}
