import { db } from "@/lib/db";
import { formatDate, formatKsh } from "@/lib/format";
import { deleteCoupon, toggleCoupon } from "@/app/actions/admin";
import { CouponForm } from "./coupon-form";

export default async function AdminCoupons() {
  const [coupons, usage] = await Promise.all([
    db.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    db.order.groupBy({ by: ["couponCode"], _count: true, where: { couponCode: { not: null }, status: { not: "CANCELLED" } } }),
  ]);
  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-6 text-3xl font-semibold">Coupons</h1>
        <ul className="space-y-3">
          {coupons.map((c) => (
            <li key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-mono text-lg font-semibold">{c.code}</p>
                <p className="text-sm text-stone-500">
                  {[c.percentOff && `${c.percentOff}% off`, c.amountOff && `${formatKsh(c.amountOff)} off`].filter(Boolean).join(" + ")}
                  {c.minSubtotal > 0 && ` · min ${formatKsh(c.minSubtotal)}`}
                  {c.expiresAt && ` · expires ${formatDate(c.expiresAt)}`}
                  {c.perCustomer !== null && ` · ${c.perCustomer} per customer`}
                  {c.firstOrderOnly && " · first order only"}
                  {` · used ${usage.find((u) => u.couponCode === c.code)?._count ?? 0}${c.maxUses !== null ? ` / ${c.maxUses}` : "×"}`}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={toggleCoupon.bind(null, c.id)}><button className="btn-secondary px-3 py-1.5 text-xs">{c.active ? "Disable" : "Enable"}</button></form>
                <form action={deleteCoupon.bind(null, c.id)}><button className="btn-secondary px-3 py-1.5 text-xs text-blush-600">Delete</button></form>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="mb-6 text-2xl">New coupon</h2>
        <CouponForm />
      </div>
    </div>
  );
}
