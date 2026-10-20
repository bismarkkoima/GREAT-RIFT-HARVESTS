"use client";

import { useActionState } from "react";
import { createCoupon } from "@/app/actions/admin";

export function CouponForm() {
  const [state, action, pending] = useActionState(createCoupon, null);
  return (
    <form action={action} className="card space-y-4 p-6">
      <div><label className="label" htmlFor="code">Code</label><input id="code" name="code" required className="input uppercase" placeholder="VALENTINE20" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="percentOff">% off</label><input id="percentOff" name="percentOff" type="number" min={0} max={100} defaultValue={0} className="input" /></div>
        <div><label className="label" htmlFor="amountOff">Ksh off</label><input id="amountOff" name="amountOff" type="number" min={0} defaultValue={0} className="input" /></div>
      </div>
      <div><label className="label" htmlFor="minSubtotal">Minimum order (Ksh)</label><input id="minSubtotal" name="minSubtotal" type="number" min={0} defaultValue={0} className="input" /></div>
      <div><label className="label" htmlFor="expiresAt">Expires (optional)</label><input id="expiresAt" name="expiresAt" type="date" className="input" /></div>
      {state?.error && <p className="text-sm text-blush-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-brand-700">{state.message}</p>}
      <button disabled={pending} className="btn-primary w-full">Create coupon</button>
    </form>
  );
}
