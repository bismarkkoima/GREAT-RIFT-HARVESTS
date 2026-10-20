"use client";

import { useActionState } from "react";
import { subscribeNewsletter } from "@/app/actions/public";

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeNewsletter, null);
  if (state?.ok) return <p className="text-sm text-brand-200">🌸 Thanks! You&apos;re on the list.</p>;
  return (
    <form action={action} className="flex gap-2">
      <input name="email" type="email" required placeholder="you@example.com" aria-label="Email address" className="input flex-1 border-brand-800 bg-brand-900 text-white placeholder:text-brand-400 dark:bg-brand-900" />
      <button disabled={pending} className="btn bg-white text-brand-900 hover:bg-brand-100">
        {pending ? "…" : "Join"}
      </button>
      {state?.error && <p className="text-xs text-blush-300">{state.error}</p>}
    </form>
  );
}
