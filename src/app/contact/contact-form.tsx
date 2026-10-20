"use client";

import { useActionState } from "react";
import { sendContactMessage } from "@/app/actions/public";

export function ContactForm({ defaultSubject }: { defaultSubject?: string }) {
  const [state, action, pending] = useActionState(sendContactMessage, null);
  if (state?.ok) {
    return (
      <div className="card flex flex-col items-center justify-center p-12 text-center">
        <p className="text-5xl">💌</p>
        <p className="mt-4 text-lg">{state.message}</p>
      </div>
    );
  }
  return (
    <form action={action} className="card space-y-4 p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required className="input" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone (optional)</label>
          <input id="phone" name="phone" type="tel" className="input" autoComplete="tel" />
        </div>
        <div>
          <label className="label" htmlFor="subject">Subject</label>
          <input id="subject" name="subject" required defaultValue={defaultSubject} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="message">Message</label>
        <textarea id="message" name="message" required rows={6} className="input" />
      </div>
      {state?.error && <p className="text-sm text-blush-600">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full py-3">{pending ? "Sending…" : "Send message"}</button>
    </form>
  );
}
