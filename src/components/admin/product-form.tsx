"use client";

import { useState } from "react";
import { saveProduct } from "@/app/actions/admin";
import { useFormAction } from "@/components/ui/use-form-action";

type Variant = { id?: string; label: string; stems: number; price: number; stock: number };
type Product = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  details: string;
  image: string;
  tags: string;
  featured: boolean;
  active: boolean;
  variants: Variant[];
};

export function ProductForm({ product, categories }: { product?: Product; categories: { id: string; name: string }[] }) {
  const [state, action, pending] = useFormAction(saveProduct);
  const [variants, setVariants] = useState<Variant[]>(
    product?.variants ?? [
      { label: "Bundle (10 stems)", stems: 10, price: 1500, stock: 100 },
      { label: "Box (100 stems)", stems: 100, price: 13000, stock: 20 },
    ],
  );
  const [preview, setPreview] = useState(product?.image ?? "");
  const update = (i: number, patch: Partial<Variant>) => setVariants((v) => v.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <form onSubmit={action} className="space-y-6">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />

      <section className="card grid gap-4 p-6 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required defaultValue={product?.name} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="slug">URL slug (optional)</label>
          <input id="slug" name="slug" defaultValue={product?.slug} placeholder="auto-generated from name" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="categoryId">Category</label>
          <select id="categoryId" name="categoryId" required defaultValue={product?.categoryId} className="input">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="tags">Tags (comma separated)</label>
          <input id="tags" name="tags" defaultValue={product?.tags} placeholder="wedding,birthday" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">Short description</label>
          <textarea id="description" name="description" required rows={2} defaultValue={product?.description} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="details">Care &amp; details</label>
          <textarea id="details" name="details" rows={3} defaultValue={product?.details} className="input" />
        </div>
        <div className="flex gap-6 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="h-4 w-4 accent-brand-700" /> Visible in shop</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={product?.featured} className="h-4 w-4 accent-brand-700" /> Featured on homepage</label>
        </div>
      </section>

      <section className="card grid gap-4 p-6 sm:grid-cols-[120px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview ? <img src={preview} alt="" className="h-28 w-28 rounded-xl object-cover" /> : <div className="h-28 w-28 rounded-xl bg-stone-100 dark:bg-stone-800" />}
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="imageFile">Upload image</label>
            <input id="imageFile" name="imageFile" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="text-sm"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setPreview(URL.createObjectURL(f)); }} />
          </div>
          <div>
            <label className="label" htmlFor="imageUrl">…or image URL / path</label>
            <input id="imageUrl" name="imageUrl" defaultValue={product?.image} placeholder="/images/classicrose.webp" className="input" onChange={(e) => setPreview(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card space-y-3 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Sizes &amp; pricing</h2>
          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setVariants((v) => [...v, { label: "", stems: 1, price: 0, stock: 0 }])}>+ Add size</button>
        </div>
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-stone-500 sm:grid">
          <span>Label</span><span>Stems</span><span>Price (Ksh)</span><span>Stock</span><span />
        </div>
        {variants.map((v, i) => (
          <div key={v.id ?? i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <input aria-label="Label" className="input col-span-2 sm:col-span-1" value={v.label} onChange={(e) => update(i, { label: e.target.value })} />
            <input aria-label="Stems" className="input" type="number" min={1} value={v.stems} onChange={(e) => update(i, { stems: Number(e.target.value) })} />
            <input aria-label="Price" className="input" type="number" min={1} value={v.price} onChange={(e) => update(i, { price: Number(e.target.value) })} />
            <input aria-label="Stock" className="input" type="number" min={0} value={v.stock} onChange={(e) => update(i, { stock: Number(e.target.value) })} />
            <button type="button" aria-label="Remove size" className="text-sm text-blush-600 disabled:opacity-30" disabled={variants.length === 1} onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
      </section>

      {state?.error && <p className="rounded-xl bg-blush-50 p-3 text-sm text-blush-700">{state.error}</p>}
      <button disabled={pending} className="btn-primary px-8 py-3">{pending ? "Saving…" : product ? "Save changes" : "Create product"}</button>
    </form>
  );
}
