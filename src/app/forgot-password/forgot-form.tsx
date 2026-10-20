"use client";

import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import { useFormAction } from "@/components/ui/use-form-action";

export function ForgotForm() {
  const [state, action, pending] = useFormAction(requestPasswordReset);
  if (state?.ok) {
    return (
      <div className="card p-8 text-center">
        <p className="text-5xl">📬</p>
        <p className="mt-4">{state.message}</p>
        <Link href="/login" className="btn-secondary mt-6">Back to sign in</Link>
      </div>
    );
  }
  return (
    <form onSubmit={action} className="card space-y-4 p-6 sm:p-8">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      {state?.error && <p className="text-sm text-blush-600">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full py-3">{pending ? "Sending…" : "Send reset link"}</button>
      <p className="text-center text-sm text-stone-500">
        Remembered it? <Link href="/login" className="font-semibold text-brand-700 hover:underline dark:text-brand-400">Sign in</Link>
      </p>
    </form>
  );
}
