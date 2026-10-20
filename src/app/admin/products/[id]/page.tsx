import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { deleteProduct } from "@/app/actions/admin";
import { ProductForm } from "@/components/admin/product-form";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { variants: { orderBy: { sortOrder: "asc" } } } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!product) notFound();
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Edit {product.name}</h1>
        <div className="flex gap-2">
          <Link href={`/shop/${product.slug}`} target="_blank" className="btn-secondary">View in shop</Link>
          <form action={deleteProduct.bind(null, product.id)}>
            <button className="btn-danger">Delete</button>
          </form>
        </div>
      </div>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
