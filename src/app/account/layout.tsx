import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="container-page py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">My account</p>
          <h1 className="text-4xl font-semibold">Hello, {user.name.split(" ")[0]} 🌸</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/account" className="btn-secondary">Orders &amp; profile</Link>
          <Link href="/account/subscriptions" className="btn-secondary">Subscriptions</Link>
          <Link href="/account/wishlist" className="btn-secondary">Wishlist</Link>
          <form action={logout}>
            <button className="btn-secondary">Sign out</button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
