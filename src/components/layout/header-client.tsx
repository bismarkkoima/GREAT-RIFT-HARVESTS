"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/components/cart/cart-provider";
import { CartIcon, CloseIcon, HeartIcon, MenuIcon, MoonIcon, SunIcon, UserIcon } from "@/components/ui/icons";
import { NAV } from "./nav";

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100"
                : "text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };
  return (
    <button onClick={toggle} aria-label="Toggle dark mode" className="rounded-full p-2 hover:bg-stone-200/60 dark:hover:bg-stone-800">
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

export function HeaderActions({ user }: { user: { name: string; isAdmin: boolean } | null }) {
  const { count, open, ready } = useCart();
  return (
    <div className="flex items-center gap-1">
      <ThemeToggle />
      {user?.isAdmin && (
        <Link href="/admin" className="hidden rounded-full bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white sm:inline-block dark:bg-white dark:text-stone-900">
          Admin
        </Link>
      )}
      <Link href="/account/wishlist" aria-label="Wishlist" className="hidden rounded-full p-2 hover:bg-stone-200/60 sm:block dark:hover:bg-stone-800">
        <HeartIcon />
      </Link>
      <Link href={user ? "/account" : "/login"} aria-label="Account" className="flex items-center gap-2 rounded-full p-2 hover:bg-stone-200/60 dark:hover:bg-stone-800">
        <UserIcon />
        {user && <span className="hidden text-sm font-medium lg:inline">{user.name.split(" ")[0]}</span>}
      </Link>
      <button onClick={open} aria-label={`Open cart (${count} items)`} className="relative rounded-full p-2 hover:bg-stone-200/60 dark:hover:bg-stone-800">
        <CartIcon />
        {ready && count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blush-600 px-1 text-[11px] font-bold text-white">
            {count}
          </span>
        )}
      </button>
    </div>
  );
}

export function MobileMenu({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <>
      <button className="rounded-full p-2 md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <MenuIcon />
      </button>
      {/* Portal to <body>: the header's backdrop-blur would otherwise become the containing block for this fixed overlay. */}
      {open && createPortal(
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <nav className="absolute left-0 top-0 flex h-full w-72 flex-col gap-1 bg-white p-6 shadow-xl dark:bg-stone-900">
            <button className="mb-4 self-end p-2" onClick={() => setOpen(false)} aria-label="Close menu">
              <CloseIcon />
            </button>
            {[...NAV, { href: "/account", label: "My Account" }, ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : [])].map((item) => (
              <Link key={item.href} href={item.href} className="rounded-xl px-4 py-3 font-medium hover:bg-stone-100 dark:hover:bg-stone-800">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>,
        document.body,
      )}
    </>
  );
}
