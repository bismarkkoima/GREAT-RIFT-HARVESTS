"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/auth";

export function ProfileForm({ user }: { user: { name: string; email: string; phone: string } }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  return (
    <form action={action} className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" value={user.email} disabled className="input opacity-70" />
      </div>
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input id="name" name="name" defaultValue={user.name} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="phone">Phone</label>
        <input id="phone" name="phone" defaultValue={user.phone} className="input" />
      </div>
      <details className="rounded-xl border border-stone-200 p-4 dark:border-stone-700">
        <summary className="cursor-pointer text-sm font-medium">Change password</summary>
        <div className="mt-4 space-y-3">
          <input name="currentPassword" type="password" placeholder="Current password" className="input" autoComplete="current-password" />
          <input name="newPassword" type="password" placeholder="New password (8+ characters)" className="input" autoComplete="new-password" />
        </div>
      </details>
      {state?.error && <p className="text-sm text-blush-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-brand-700 dark:text-brand-400">{state.message}</p>}
      <button disabled={pending} className="btn-primary w-full">{pending ? "Saving…" : "Save changes"}</button>
    </form>
  );
}
