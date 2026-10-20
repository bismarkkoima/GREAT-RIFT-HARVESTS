import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getFeaturedProducts } from "@/lib/queries";
import { ProductCard } from "@/components/product/product-card";
import { Stars } from "@/components/product/stars";
import { LeafIcon, ShieldIcon, TruckIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, categories, reviews] = await Promise.all([
    getFeaturedProducts(4),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.review.findMany({ where: { rating: { gte: 4 } }, include: { user: { select: { name: true } }, product: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="container-page grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-fade-up">
            <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200">🌱 Grown in the heart of Kenya</span>
            <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Flowers cut at dawn, <span className="italic text-brand-700 dark:text-brand-400">at your door</span> by noon.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-stone-600 dark:text-stone-400">
              Delivering the beauty of the Great Rift Valley straight to your doorstep — roses, bouquets and wildflowers from our farms near Lake Naivasha.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="btn-primary px-7 py-3 text-base">Shop now</Link>
              <Link href="/about" className="btn-secondary px-7 py-3 text-base">Visit our farm</Link>
            </div>
          </div>
          <div className="relative grid grid-cols-2 gap-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-3xl shadow-xl">
              <Image src="/images/elegantbouquet.webp" alt="Elegant bouquet" fill priority sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
            </div>
            <div className="relative mt-12 aspect-[3/4] overflow-hidden rounded-3xl shadow-xl">
              <Image src="/images/classicrose.webp" alt="Classic roses" fill priority sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-6 py-8 sm:grid-cols-3">
        {[
          { icon: <LeafIcon />, title: "Farm fresh", text: "Picked the same morning, never sat in a warehouse." },
          { icon: <TruckIcon />, title: "Same-day delivery", text: "Order before 11am for same-day delivery in Nairobi & Nakuru." },
          { icon: <ShieldIcon />, title: "Freshness guarantee", text: "Not perfect? We'll replace your flowers, no questions asked." },
        ].map((f) => (
          <div key={f.title} className="card flex gap-4 p-6">
            <span className="text-brand-600 dark:text-brand-400">{f.icon}</span>
            <div>
              <p className="font-semibold">{f.title}</p>
              <p className="text-sm text-stone-500">{f.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="container-page py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-3xl">Shop by category</h2>
          <Link href="/shop" className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-400">View all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.id} href={`/shop?category=${c.slug}`} className="group relative aspect-square overflow-hidden rounded-3xl">
              <Image src={c.image || "/images/wildflowers.jfif"} alt={c.name} fill sizes="25vw" className="object-cover transition duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <p className="font-display text-xl font-semibold">{c.name}</p>
                <p className="line-clamp-1 text-xs text-white/80">{c.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page py-8">
        <h2 className="mb-8 text-3xl">Featured flowers</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-brand-800 text-white md:grid-cols-2">
          <div className="relative h-72 md:h-full md:min-h-96">
            <Image src="/images/wildflowers.jfif" alt="Wildflowers on our farm" fill sizes="50vw" className="object-cover" />
          </div>
          <div className="p-8 md:p-12">
            <h2 className="text-3xl text-white">Weddings, events &amp; wholesale</h2>
            <p className="mt-4 text-brand-100">
              From a single table centrepiece to 1,000 stems for a hotel lobby, our florists will design something unforgettable. Boxes of 100 stems are available on every flower.
            </p>
            <Link href="/contact?subject=Event%20enquiry" className="btn mt-6 bg-white text-brand-900 hover:bg-brand-50">Get a quote</Link>
          </div>
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="container-page py-8">
          <h2 className="mb-8 text-3xl">Loved across Kenya</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className="card p-6">
                <Stars rating={r.rating} />
                <blockquote className="mt-3 text-stone-700 dark:text-stone-300">&ldquo;{r.comment}&rdquo;</blockquote>
                <figcaption className="mt-4 text-sm text-stone-500">
                  {r.user.name} · {r.product.name}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
