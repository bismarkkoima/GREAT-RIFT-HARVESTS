"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "./cart-provider";
import { QuantityStepper } from "./quantity-stepper";
import { CloseIcon, TrashIcon } from "@/components/ui/icons";
import { formatKsh } from "@/lib/format";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/pricing";

export function CartDrawer() {
  const { items, isOpen, close, subtotal, setQuantity, remove } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  if (!isOpen) return null;
  const remaining = FREE_DELIVERY_THRESHOLD - subtotal;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={close} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md animate-slide-in flex-col bg-white shadow-2xl dark:bg-stone-900">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-stone-800">
          <h2 className="text-xl">Your cart</h2>
          <button onClick={close} aria-label="Close cart" className="rounded-full p-2 hover:bg-stone-100 dark:hover:bg-stone-800">
            <CloseIcon />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-5xl">🌷</p>
            <p className="text-stone-500">Your cart is empty.</p>
            <Link href="/shop" onClick={close} className="btn-primary">
              Browse flowers
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-brand-50 px-6 py-3 text-sm text-brand-800 dark:bg-brand-950 dark:text-brand-200">
              {remaining > 0 ? (
                <>Add <strong>{formatKsh(remaining)}</strong> more for free delivery.</>
              ) : (
                <>🎉 You&apos;ve unlocked free delivery!</>
              )}
            </div>
            <ul className="flex-1 divide-y divide-stone-200 overflow-y-auto px-6 dark:divide-stone-800">
              {items.map((item) => (
                <li key={item.variantId} className="flex gap-4 py-4">
                  <Image src={item.image} alt={item.name} width={80} height={80} className="h-20 w-20 rounded-xl object-cover" />
                  <div className="flex flex-1 flex-col">
                    <Link href={`/shop/${item.slug}`} onClick={close} className="font-medium hover:underline">
                      {item.name}
                    </Link>
                    <span className="text-xs text-stone-500">{item.variantLabel}</span>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <QuantityStepper size="sm" value={item.quantity} onChange={(n) => setQuantity(item.variantId, n)} />
                      <span className="text-sm font-semibold">{formatKsh(item.price * item.quantity)}</span>
                    </div>
                  </div>
                  <button onClick={() => remove(item.variantId)} aria-label={`Remove ${item.name}`} className="self-start p-1 text-stone-400 hover:text-blush-600">
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
            <div className="space-y-3 border-t border-stone-200 p-6 dark:border-stone-800">
              <div className="flex justify-between text-base font-semibold">
                <span>Subtotal</span>
                <span>{formatKsh(subtotal)}</span>
              </div>
              <p className="text-xs text-stone-500">Delivery and discounts are calculated at checkout.</p>
              <Link href="/checkout" onClick={close} className="btn-primary w-full">
                Checkout
              </Link>
              <Link href="/cart" onClick={close} className="btn-secondary w-full">
                View cart
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
