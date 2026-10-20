import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatKsh } from "@/lib/format";

export default async function AdminProducts() {
  const products = await db.product.findMany({ include: { category: true, variants: true }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">+ New product</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 text-xs uppercase text-stone-500 dark:border-stone-800">
            <tr><th className="p-4">Product</th><th className="p-4">Category</th><th className="p-4">Price</th><th className="p-4">Stock</th><th className="p-4">Status</th><th className="p-4" /></tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Image src={p.image} alt="" width={44} height={44} className="h-11 w-11 rounded-lg object-cover" />
                    <span className="font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="p-4">{p.category.name}</td>
                <td className="p-4 whitespace-nowrap">{p.variants.length ? formatKsh(Math.min(...p.variants.map((v) => v.price))) : "—"}</td>
                <td className="p-4">{p.variants.reduce((n, v) => n + v.stock, 0)}</td>
                <td className="p-4">
                  <span className={`badge ${p.active ? "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200" : "bg-stone-200 text-stone-600 dark:bg-stone-800"}`}>{p.active ? "Live" : "Hidden"}</span>
                  {p.featured && <span className="badge ml-1 bg-amber-100 text-amber-800">Featured</span>}
                </td>
                <td className="p-4 text-right"><Link href={`/admin/products/${p.id}`} className="font-medium text-brand-700 hover:underline dark:text-brand-400">Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
