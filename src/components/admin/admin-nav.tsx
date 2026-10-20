"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders", badge: "pending" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/messages", label: "Messages", badge: "unread" },
  { href: "/admin/subscribers", label: "Subscribers" },
] as const;

export function AdminNav({ unread, pending }: { unread: number; pending: number }) {
  const pathname = usePathname();
  const counts = { unread, pending };
  return (
    <nav className="card flex gap-1 overflow-x-auto p-2 lg:sticky lg:top-28 lg:h-fit lg:flex-col">
      <p className="hidden px-3 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500 lg:block">Store admin</p>
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        const count = "badge" in l ? counts[l.badge] : 0;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center justify-between whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium ${
              active ? "bg-brand-700 text-white" : "hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            {l.label}
            {count > 0 && <span className={`ml-2 rounded-full px-2 text-xs ${active ? "bg-white/20" : "bg-blush-600 text-white"}`}>{count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
