import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { mpesaConfigured } from "@/lib/mpesa";
import { DELIVERY_ZONES } from "@/lib/pricing";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  return (
    <div className="container-page py-12">
      <h1 className="mb-8 text-4xl font-semibold">Checkout</h1>
      <CheckoutForm
        user={user ? { name: user.name, email: user.email, phone: user.phone ?? "" } : null}
        cities={Object.keys(DELIVERY_ZONES)}
        simulated={!mpesaConfigured()}
      />
    </div>
  );
}
