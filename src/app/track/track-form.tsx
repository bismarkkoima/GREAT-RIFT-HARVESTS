"use client";

import { useActionState } from "react";
import { trackOrder } from "@/app/actions/checkout";

export function TrackForm() {
  const [state, action, pending] = useActionState(trackOrder, null);
  return (
    <form action={action} className="card mt-8 space-y-4 p-6">
      <div>
        <label className="label" htmlFor="orderNumber">Order number</label>
        <input id="orderNumber" name="orderNumber" required placeholder="GRH-1A2B3C4D" className="input uppercase" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="input" />
      </div>
      {state?.error && <p className="text-sm text-blush-600">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full">{pending ? "Looking…" : "Track order"}</button>
    </form>
  );
}
