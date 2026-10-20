import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="text-6xl">🥀</p>
      <h1 className="mt-6 text-4xl font-semibold">This page has wilted</h1>
      <p className="mt-2 text-stone-500">We couldn&apos;t find what you were looking for.</p>
      <Link href="/shop" className="btn-primary mt-8">Browse fresh flowers</Link>
    </div>
  );
}
