"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCart } from "@/components/cart/cart-provider";

export function ClearCartOnMount() {
  const { clear, ready } = useCart();
  useEffect(() => {
    if (ready) clear();
  }, [ready, clear]);
  return null;
}

export function PaymentPoller({ token }: { token: string }) {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const id = setInterval(async () => {
      tries += 1;
      try {
        const res = await fetch(`/api/orders/${token}/status`, { cache: "no-store" });
        const data = await res.json();
        if (data.paymentStatus !== "PENDING" || tries > 40) {
          clearInterval(id);
          router.refresh();
        }
      } catch {
        // keep polling
      }
    }, 3000);
    return () => clearInterval(id);
  }, [token, router]);
  return null;
}
