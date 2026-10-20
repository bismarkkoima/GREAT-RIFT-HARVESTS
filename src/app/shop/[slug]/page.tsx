import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, parseGallery } from "@/lib/format";
import { averageRating, productCardInclude } from "@/lib/queries";
import { AddToCart } from "@/components/product/add-to-cart";
import { ProductCard } from "@/components/product/product-card";
import { ReviewForm } from "@/components/product/review-form";
import { Stars } from "@/components/product/stars";

type Params = Promise<{ slug: string }>;

async function getProduct(slug: string) {
  return db.product.findFirst({
    where: { slug, active: true },
    include: {
      category: true,
      variants: { orderBy: { sortOrder: "asc" } },
      reviews: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  return { title: product.name, description: product.description, openGraph: { images: [product.image] } };
}

export default async function ProductPage({ params }: { params: Params }) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();

  const user = await getCurrentUser();
  const [wished, related] = await Promise.all([
    user ? db.wishlistItem.findUnique({ where: { userId_productId: { userId: user.id, productId: product.id } } }) : null,
    db.product.findMany({ where: { active: true, categoryId: product.categoryId, NOT: { id: product.id } }, include: productCardInclude, take: 4 }),
  ]);
  const gallery = parseGallery(product.gallery);
  const images = gallery.length > 0 ? gallery : [product.image];
  const rating = averageRating(product.reviews);
  const minPrice = Math.min(...product.variants.map((v) => v.price));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: images,
    description: product.description,
    offers: { "@type": "AggregateOffer", priceCurrency: "KES", lowPrice: minPrice, highPrice: Math.max(...product.variants.map((v) => v.price)) },
    ...(product.reviews.length > 0 && { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.toFixed(1), reviewCount: product.reviews.length } }),
  };

  return (
    <div className="container-page py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-6 text-sm text-stone-500">
        <Link href="/shop" className="hover:underline">Shop</Link> /{" "}
        <Link href={`/shop?category=${product.category.slug}`} className="hover:underline">{product.category.name}</Link> /{" "}
        <span className="text-stone-800 dark:text-stone-200">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-stone-100 dark:bg-stone-800">
            <Image src={images[0]} alt={product.name} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.slice(1).map((src) => (
                <div key={src} className="relative aspect-square overflow-hidden rounded-2xl">
                  <Image src={src} alt="" fill sizes="12vw" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">{product.category.name}</p>
            <h1 className="mt-1 text-4xl font-semibold">{product.name}</h1>
            {product.reviews.length > 0 && (
              <a href="#reviews" className="mt-2 inline-block"><Stars rating={rating} count={product.reviews.length} /></a>
            )}
          </div>
          <p className="text-lg text-stone-600 dark:text-stone-400">{product.description}</p>
          <AddToCart
            product={{ id: product.id, slug: product.slug, name: product.name, image: product.image }}
            variants={product.variants}
            initiallyWished={Boolean(wished)}
          />
          {product.details && (
            <div className="card p-5">
              <p className="font-semibold">Care &amp; details</p>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{product.details}</p>
            </div>
          )}
          <ul className="space-y-1 text-sm text-stone-500">
            <li>🚚 Same-day delivery in Nairobi &amp; Nakuru for orders before 11am</li>
            <li>💚 Freshness guaranteed for 7 days</li>
            <li>📱 Pay with M-Pesa or cash on delivery</li>
          </ul>
        </div>
      </div>

      <section id="reviews" className="mt-20 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-6 text-2xl">Customer reviews</h2>
          {product.reviews.length === 0 ? (
            <p className="text-stone-500">No reviews yet — be the first!</p>
          ) : (
            <ul className="space-y-4">
              {product.reviews.map((r) => (
                <li key={r.id} className="card p-5">
                  <div className="flex items-center justify-between">
                    <Stars rating={r.rating} />
                    <span className="text-xs text-stone-500">{formatDate(r.createdAt)}</span>
                  </div>
                  <p className="mt-2">{r.comment}</p>
                  <p className="mt-2 text-sm text-stone-500">— {r.user.name}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          {user ? (
            <ReviewForm productId={product.id} />
          ) : (
            <div className="card p-6">
              <p className="font-semibold">Share your experience</p>
              <p className="mt-1 text-sm text-stone-500">Sign in to write a review.</p>
              <Link href={`/login?next=/shop/${product.slug}`} className="btn-primary mt-4">Sign in</Link>
            </div>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-2xl">You may also like</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
