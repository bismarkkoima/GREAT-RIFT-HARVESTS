import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { productCardInclude } from "@/lib/queries";
import { ProductCard } from "@/components/product/product-card";
import { SearchIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Shop flowers", description: "Browse fresh Kenyan roses, bouquets and wildflowers." };
export const dynamic = "force-dynamic";

const SORTS = {
  featured: { label: "Featured", orderBy: [{ featured: "desc" }, { createdAt: "asc" }] },
  newest: { label: "Newest", orderBy: [{ createdAt: "desc" }] },
  name: { label: "Name A–Z", orderBy: [{ name: "asc" }] },
} satisfies Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput[] }>;

type SP = Promise<{ q?: string; category?: string; sort?: string; max?: string }>;

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const { q = "", category = "", sort = "featured", max = "" } = await searchParams;
  const maxPrice = Number(max) || undefined;
  const sortKey = (sort in SORTS ? sort : "featured") as keyof typeof SORTS;

  const where: Prisma.ProductWhereInput = {
    active: true,
    ...(category && { category: { slug: category } }),
    ...(q && { OR: [{ name: { contains: q } }, { description: { contains: q } }, { tags: { contains: q.toLowerCase() } }] }),
    ...(maxPrice && { variants: { some: { price: { lte: maxPrice } } } }),
  };

  const [categories, products] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.product.findMany({ where, include: productCardInclude, orderBy: SORTS[sortKey].orderBy }),
  ]);

  // price sorting needs the cheapest variant, so do it in memory
  const sorted =
    sort === "price-asc" || sort === "price-desc"
      ? [...products].sort((a, b) => {
          const pa = Math.min(...a.variants.map((v) => v.price));
          const pb = Math.min(...b.variants.map((v) => v.price));
          return sort === "price-asc" ? pa - pb : pb - pa;
        })
      : products;

  const href = (patch: Record<string, string>) => {
    const params = new URLSearchParams({ q, category, sort, max, ...patch });
    for (const [k, v] of [...params]) if (!v) params.delete(k);
    const s = params.toString();
    return s ? `/shop?${s}` : "/shop";
  };

  return (
    <div className="container-page py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold">Shop flowers</h1>
        <p className="mt-2 text-stone-500">Every stem is grown on our Rift Valley farms and cut fresh for your order.</p>
      </div>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Link href={href({ category: "" })} className={`btn px-4 py-2 ${!category ? "bg-brand-700 text-white" : "btn-secondary"}`}>All</Link>
          {categories.map((c) => (
            <Link key={c.id} href={href({ category: c.slug })} className={`btn px-4 py-2 ${category === c.slug ? "bg-brand-700 text-white" : "btn-secondary"}`}>
              {c.name}
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap gap-2" action="/shop">
          {category && <input type="hidden" name="category" value={category} />}
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input name="q" defaultValue={q} placeholder="Search flowers, occasions…" className="input w-56 pl-10" aria-label="Search" />
          </div>
          <select name="max" defaultValue={max} className="input w-auto" aria-label="Maximum price">
            <option value="">Any price</option>
            <option value="1500">Under Ksh 1,500</option>
            <option value="2000">Under Ksh 2,000</option>
            <option value="5000">Under Ksh 5,000</option>
          </select>
          <select name="sort" defaultValue={sort} className="input w-auto" aria-label="Sort by">
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
          <button className="btn-primary">Apply</button>
        </form>
      </div>

      {sorted.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl">🥀</p>
          <p className="mt-3 text-stone-500">No flowers match your search.</p>
          <Link href="/shop" className="btn-secondary mt-4">Clear filters</Link>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-stone-500">{sorted.length} {sorted.length === 1 ? "product" : "products"}</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {sorted.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
