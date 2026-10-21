import Link from "next/link";
import { NewsletterForm } from "./newsletter-form";

export function Footer() {
  return (
    <footer className="mt-24 bg-brand-950 text-brand-100">
      <div className="container-page grid gap-10 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-2xl text-white">🌿 Great Rift Harvests</p>
          <p className="mt-3 max-w-sm text-sm text-brand-200">
            Farm-fresh flowers grown in the heart of Kenya&apos;s Great Rift Valley, cut at dawn and delivered to your doorstep.
          </p>
          <div className="mt-6 max-w-sm">
            <p className="mb-2 text-sm font-semibold text-white">Get seasonal offers</p>
            <NewsletterForm />
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Shop</p>
          <ul className="space-y-2 text-sm text-brand-200">
            <li><Link href="/shop" className="hover:text-white">All flowers</Link></li>
            <li><Link href="/shop?category=bouquets" className="hover:text-white">Bouquets</Link></li>
            <li><Link href="/shop?category=roses" className="hover:text-white">Roses</Link></li>
            <li><Link href="/shop?category=wildflowers" className="hover:text-white">Wildflowers</Link></li>
            <li><Link href="/subscriptions" className="hover:text-white">Flower subscriptions</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Help</p>
          <ul className="space-y-2 text-sm text-brand-200">
            <li><Link href="/track" className="hover:text-white">Track your order</Link></li>
            <li><Link href="/about" className="hover:text-white">Our farm</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact us</Link></li>
            <li><Link href="/account" className="hover:text-white">My account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-brand-900">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-brand-300 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Great Rift Harvests. All rights reserved.</p>
          <p>Pay securely with M-Pesa or cash on delivery.</p>
        </div>
      </div>
    </footer>
  );
}
