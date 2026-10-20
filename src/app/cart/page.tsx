import type { Metadata } from "next";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <div className="container-page py-12">
      <h1 className="mb-8 text-4xl font-semibold">Your cart</h1>
      <CartView />
    </div>
  );
}
