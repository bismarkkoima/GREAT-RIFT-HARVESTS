import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { mpesaConfigured } from "@/lib/mpesa";
import { DELIVERY_ZONES } from "@/lib/pricing";
import { MAX_DAYS_AHEAD, addDays, nairobiNow } from "@/lib/delivery";
import { SUBSCRIPTION_DISCOUNT } from "@/lib/subscriptions";
import { SubscriptionForm } from "./subscription-form";

export const metadata: Metadata = {
  title: "Flower subscriptions",
  description: "Fresh Kenyan flowers delivered every week, fortnight or month — save 10% on every delivery.",
};
export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const [user, products] = await Promise.all([
    getCurrentUser(),
    db.product.findMany({
      where: { active: true },
      include: { variants: { where: { stock: { gt: 0 } }, orderBy: { sortOrder: "asc" } } },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
    }),
  ]);
  const today = nairobiNow().dateKey;
  const choices = products
    .filter((p) => p.variants.length > 0)
    .map((p) => ({ id: p.id, name: p.name, image: p.image, variants: p.variants.map((v) => ({ id: v.id, label: v.label, price: v.price })) }));

  return (
    <>
      <section className="relative overflow-hidden bg-brand-900 text-white">
        <Image src="/images/sunshinebouqet.jpeg" alt="" fill priority sizes="100vw" className="object-cover opacity-25" />
        <div className="container-page relative py-20 text-center">
          <span className="badge bg-white/15 text-white">Save {SUBSCRIPTION_DISCOUNT}% on every delivery</span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold text-white sm:text-5xl">Fresh flowers, on repeat</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-100">
            Choose your favourite bunch and how often you&apos;d like it. We&apos;ll cut it fresh and deliver it — every week, fortnight or month.
          </p>
        </div>
      </section>

      <section className="container-page grid gap-6 py-12 sm:grid-cols-3">
        {[
          { n: "1", title: "Pick your flowers", text: "Any bunch from our farm, in a bundle or a box." },
          { n: "2", title: "Choose how often", text: "Weekly, fortnightly or monthly, on the day and time that suits you." },
          { n: "3", title: "Relax", text: "Pause, skip or cancel anytime from your account. No commitment." },
        ].map((s) => (
          <div key={s.n} className="card p-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800 dark:bg-brand-900 dark:text-brand-200">{s.n}</span>
            <p className="mt-3 font-semibold">{s.title}</p>
            <p className="text-sm text-stone-500">{s.text}</p>
          </div>
        ))}
      </section>

      <section className="container-page pb-8">
        {user ? (
          <SubscriptionForm
            products={choices}
            user={{ name: user.name, phone: user.phone ?? "" }}
            cities={Object.keys(DELIVERY_ZONES)}
            discount={SUBSCRIPTION_DISCOUNT}
            minDate={today}
            maxDate={addDays(today, MAX_DAYS_AHEAD)}
            simulated={!mpesaConfigured()}
          />
        ) : (
          <div className="card mx-auto max-w-lg p-8 text-center">
            <p className="text-4xl">🌷</p>
            <h2 className="mt-3 text-2xl">Sign in to subscribe</h2>
            <p className="mt-2 text-stone-500">You&apos;ll manage your deliveries from your account.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/login?next=/subscriptions" className="btn-primary">Sign in</Link>
              <Link href="/register?next=/subscriptions" className="btn-secondary">Create account</Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
