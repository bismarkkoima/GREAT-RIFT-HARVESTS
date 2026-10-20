import { db } from "@/lib/db";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProduct() {
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">New product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
