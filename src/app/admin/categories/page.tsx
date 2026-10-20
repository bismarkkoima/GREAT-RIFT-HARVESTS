import { db } from "@/lib/db";
import { CategoryForm } from "./category-form";

export default async function AdminCategories() {
  const categories = await db.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: { sortOrder: "asc" } });
  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <div>
        <h1 className="mb-6 text-3xl font-semibold">Categories</h1>
        <ul className="card divide-y divide-stone-200 dark:divide-stone-800">
          {categories.map((c) => (
            <li key={c.id} className="flex justify-between p-4">
              <span><span className="font-medium">{c.name}</span> <span className="text-sm text-stone-500">/{c.slug}</span></span>
              <span className="text-sm text-stone-500">{c._count.products} products</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="mb-6 text-2xl">Add category</h2>
        <CategoryForm />
      </div>
    </div>
  );
}
