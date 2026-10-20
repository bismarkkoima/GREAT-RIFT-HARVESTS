import Image from "next/image";
import Link from "next/link";
import { formatKsh } from "@/lib/format";
import { averageRating, type ProductCardData } from "@/lib/queries";
import { Stars } from "./stars";
import { QuickAdd } from "./quick-add";

export function ProductCard({ product }: { product: ProductCardData }) {
  const from = Math.min(...product.variants.map((v) => v.price));
  const first = product.variants[0];
  return (
    <div className="group card flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/shop/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-stone-100 dark:bg-stone-800">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        {product.featured && <span className="badge absolute left-3 top-3 bg-white/90 text-brand-800">Best seller</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">{product.category.name}</span>
        <Link href={`/shop/${product.slug}`} className="font-display text-lg font-semibold hover:underline">
          {product.name}
        </Link>
        {product.reviews.length > 0 && <Stars rating={averageRating(product.reviews)} count={product.reviews.length} />}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-sm">
            <span className="text-stone-500">from </span>
            <span className="font-semibold">{formatKsh(from)}</span>
          </span>
          {first && (
            <QuickAdd
              item={{
                variantId: first.id,
                productId: product.id,
                slug: product.slug,
                name: product.name,
                variantLabel: first.label,
                price: first.price,
                image: product.image,
              }}
              disabled={first.stock < 1}
            />
          )}
        </div>
      </div>
    </div>
  );
}
