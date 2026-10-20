"use client";

import { useState, useTransition } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { HeartIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toaster";
import { toggleWishlist } from "@/app/actions/shop";
import { formatKsh } from "@/lib/format";

type Variant = { id: string; label: string; price: number; stems: number; stock: number };

export function AddToCart({
  product,
  variants,
  initiallyWished,
}: {
  product: { id: string; slug: string; name: string; image: string };
  variants: Variant[];
  initiallyWished: boolean;
}) {
  const { add } = useCart();
  const toast = useToast();
  const [variantId, setVariantId] = useState(variants[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const [wished, setWished] = useState(initiallyWished);
  const [pending, startTransition] = useTransition();
  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  if (!variant) return <p className="text-stone-500">Currently unavailable.</p>;

  const onWish = () =>
    startTransition(async () => {
      const res = await toggleWishlist(product.id);
      if (res.error) return toast(res.error, "error");
      setWished(Boolean(res.wished));
      toast(res.wished ? "Saved to your wishlist" : "Removed from wishlist");
    });

  return (
    <div className="space-y-6">
      <p className="text-3xl font-semibold">{formatKsh(variant.price)}</p>
      <fieldset>
        <legend className="label">Choose a size</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {variants.map((v) => (
            <label
              key={v.id}
              className={`cursor-pointer rounded-2xl border-2 p-4 transition ${
                v.id === variant.id ? "border-brand-600 bg-brand-50 dark:bg-brand-950" : "border-stone-200 hover:border-stone-300 dark:border-stone-700"
              } ${v.stock < 1 ? "opacity-50" : ""}`}
            >
              <input type="radio" name="variant" value={v.id} className="sr-only" checked={v.id === variant.id} onChange={() => setVariantId(v.id)} disabled={v.stock < 1} />
              <span className="block font-semibold">{v.label}</span>
              <span className="text-sm text-stone-500">
                {formatKsh(v.price)} · {v.stock < 1 ? "Sold out" : v.stock <= 10 ? `Only ${v.stock} left` : "In stock"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper value={quantity} onChange={setQuantity} />
        <button
          className="btn-primary flex-1 py-3"
          disabled={variant.stock < 1}
          onClick={() =>
            add({ variantId: variant.id, productId: product.id, slug: product.slug, name: product.name, variantLabel: variant.label, price: variant.price, image: product.image }, quantity)
          }
        >
          Add to cart · {formatKsh(variant.price * quantity)}
        </button>
        <button onClick={onWish} disabled={pending} aria-label="Save to wishlist" className={`btn-secondary h-12 w-12 p-0 ${wished ? "text-blush-600" : ""}`}>
          <HeartIcon filled={wished} />
        </button>
      </div>
    </div>
  );
}
