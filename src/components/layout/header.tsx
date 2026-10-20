import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { HeaderActions, MobileMenu, NavLinks } from "./header-client";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-sand-50/80 backdrop-blur-lg dark:border-stone-800/70 dark:bg-stone-950/80">
      <div className="bg-brand-800 py-1.5 text-center text-xs font-medium text-brand-50">
        Free delivery on orders over Ksh 5,000 · Use code <span className="font-bold">KARIBU10</span> for 10% off
      </div>
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <MobileMenu isAdmin={user?.role === "ADMIN"} />
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold text-brand-800 dark:text-brand-300">
            <span aria-hidden>🌿</span> Great Rift Harvests
          </Link>
        </div>
        <NavLinks />
        <HeaderActions user={user ? { name: user.name, isAdmin: user.role === "ADMIN" } : null} />
      </div>
    </header>
  );
}
