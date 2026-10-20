import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { productCardInclude } from "@/lib/queries";
import { ProductCard } from "@/components/product/product-card";

export const metadata: Metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const user = await requireUser("/account/wishlist");
  const items = await db.wishlistItem.findMany({
    where: { userId: user.id, product: { active: true } },
    include: { product: { include: productCardInclude } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <section>
      <h2 className="mb-4 text-2xl">Your wishlist</h2>
      {items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-stone-500">Tap the ♡ on any flower to save it here.</p>
          <Link href="/shop" className="btn-primary mt-4">Browse flowers</Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((i) => (
            <ProductCard key={i.id} product={i.product} />
          ))}
        </div>
      )}
    </section>
  );
}
