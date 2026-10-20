"use client";

import { resetPassword } from "@/app/actions/auth";
import { useFormAction } from "@/components/ui/use-form-action";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useFormAction(resetPassword);
  return (
    <form onSubmit={action} className="card space-y-4 p-6 sm:p-8">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Confirm password</label>
        <input id="confirm" name="confirm" type="password" required minLength={8} className="input" autoComplete="new-password" />
      </div>
      {state?.error && <p className="text-sm text-blush-600">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full py-3">{pending ? "Saving…" : "Save password & sign in"}</button>
    </form>
  );
}
