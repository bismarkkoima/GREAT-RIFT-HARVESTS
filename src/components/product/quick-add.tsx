"use client";

import { useCart, type CartItem } from "@/components/cart/cart-provider";

export function QuickAdd({ item, disabled }: { item: Omit<CartItem, "quantity">; disabled?: boolean }) {
  const { add } = useCart();
  return (
    <button onClick={() => add(item)} disabled={disabled} className="btn-primary px-4 py-2 text-xs">
      {disabled ? "Sold out" : "Add"}
    </button>
  );
}
