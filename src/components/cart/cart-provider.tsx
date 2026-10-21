"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";

export type CartItem = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantLabel: string;
  price: number;
  image: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  ready: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "grh_cart_v1";
const CartContext = createContext<CartContextValue | null>(null);

// The cart lives in localStorage, read through useSyncExternalStore so the server render
// (empty cart) and the browser stay consistent, and other open tabs stay in sync.
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let cached: { raw: string | null; items: CartItem[] } = { raw: null, items: EMPTY };
let memoryOnly: CartItem[] | null = null; // used when storage is blocked (private mode etc.)

function parse(raw: string | null): CartItem[] {
  try {
    const saved = JSON.parse(raw || "[]");
    return Array.isArray(saved) ? saved : EMPTY;
  } catch {
    return EMPTY;
  }
}

function readCart(): CartItem[] {
  if (memoryOnly) return memoryOnly;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return cached.items;
  }
  if (raw !== cached.raw) cached = { raw, items: parse(raw) };
  return cached.items;
}

function writeCart(items: CartItem[]) {
  try {
    const raw = JSON.stringify(items);
    localStorage.setItem(STORAGE_KEY, raw);
    cached = { raw, items };
  } catch {
    memoryOnly = items;
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const noopSubscribe = () => () => {};

function setItems(update: (current: CartItem[]) => CartItem[]) {
  writeCart(update(readCart()));
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, readCart, () => EMPTY);
  // false during the server render and hydration, true once running in the browser
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [isOpen, setOpen] = useState(false);

  const add = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((i) => i.variantId === item.variantId);
      if (existing) {
        return current.map((i) =>
          i.variantId === item.variantId ? { ...i, quantity: Math.min(99, i.quantity + quantity) } : i,
        );
      }
      return [...current, { ...item, quantity }];
    });
    setOpen(true);
  }, []);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((i) => i.variantId !== variantId)
        : current.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(99, quantity) } : i)),
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    setItems((current) => current.filter((i) => i.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setItems(() => []), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.price * i.quantity, 0),
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [items, ready, isOpen, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
