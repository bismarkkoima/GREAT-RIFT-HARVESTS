"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register } from "@/app/actions/auth";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : register, null);
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <form action={action} className="card space-y-4 p-6 sm:p-8">
      {next && <input type="hidden" name="next" value={next} />}
      {mode === "register" && (
        <>
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" name="name" required className="input" autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone (optional)</label>
            <input id="phone" name="phone" type="tel" className="input" autoComplete="tel" placeholder="0712 345 678" />
          </div>
        </>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={mode === "register" ? 8 : undefined} className="input" autoComplete={mode === "login" ? "current-password" : "new-password"} />
      </div>
      {state?.error && <p className="text-sm text-blush-600">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full py-3">
        {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-center text-sm text-stone-500">
        {mode === "login" ? (
          <>New here? <Link href={`/register${nextQuery}`} className="font-semibold text-brand-700 hover:underline dark:text-brand-400">Create an account</Link></>
        ) : (
          <>Already have an account? <Link href={`/login${nextQuery}`} className="font-semibold text-brand-700 hover:underline dark:text-brand-400">Sign in</Link></>
        )}
      </p>
    </form>
  );
}
