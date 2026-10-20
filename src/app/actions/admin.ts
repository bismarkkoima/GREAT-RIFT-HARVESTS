"use server";

import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ORDER_STATUSES, slugify } from "@/lib/format";
import type { ActionState } from "./types";

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

// Stores uploads in /public/uploads. On serverless hosts swap this for S3/Cloudinary/Vercel Blob.
async function saveUpload(file: File) {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new Error("Images must be JPG, PNG, WEBP or AVIF.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Images must be under 5MB.");
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

const variantSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1, "Each size needs a label."),
  stems: z.coerce.number().int().min(1),
  price: z.coerce.number().int().min(1, "Each size needs a price."),
  stock: z.coerce.number().int().min(0),
});

const productSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  slug: z.string().trim().optional(),
  categoryId: z.string().min(1, "Choose a category."),
  description: z.string().trim().min(5, "Add a short description."),
  details: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  tags: z.string().trim().optional(),
});

export async function saveProduct(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "") || null;
  const parsed = productSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let variants;
  try {
    variants = z.array(variantSchema).min(1, "Add at least one size.").parse(JSON.parse(String(form.get("variants") ?? "[]")));
  } catch (e) {
    return { error: e instanceof z.ZodError ? e.issues[0].message : "Invalid sizes." };
  }

  const p = parsed.data;
  const slug = slugify(p.slug || p.name);
  if (!slug) return { error: "Please provide a valid name or slug." };
  const clash = await db.product.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
  if (clash) return { error: `Another product already uses the URL "${slug}".` };

  let image = p.imageUrl || "";
  const file = form.get("imageFile");
  if (file instanceof File && file.size > 0) {
    try {
      image = await saveUpload(file);
    } catch (e) {
      return { error: (e as Error).message };
    }
  }
  if (!image) return { error: "Please upload an image or paste an image URL." };

  const data = {
    name: p.name,
    slug,
    categoryId: p.categoryId,
    description: p.description,
    details: p.details ?? "",
    image,
    gallery: JSON.stringify([image]),
    tags: (p.tags ?? "").toLowerCase(),
    featured: form.get("featured") === "on",
    active: form.get("active") === "on",
  };

  if (id) {
    const keep = variants.filter((v) => v.id).map((v) => v.id!);
    await db.$transaction([
      db.product.update({ where: { id }, data }),
      db.productVariant.deleteMany({ where: { productId: id, id: { notIn: keep } } }),
      ...variants.map((v, i) =>
        v.id
          ? db.productVariant.update({ where: { id: v.id }, data: { label: v.label, stems: v.stems, price: v.price, stock: v.stock, sortOrder: i } })
          : db.productVariant.create({ data: { productId: id, label: v.label, stems: v.stems, price: v.price, stock: v.stock, sortOrder: i } }),
      ),
    ]);
  } else {
    await db.product.create({
      data: { ...data, variants: { create: variants.map((v, i) => ({ label: v.label, stems: v.stems, price: v.price, stock: v.stock, sortOrder: i })) } },
    });
  }
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  const used = await db.orderItem.count({ where: { productId: id } });
  if (used > 0) {
    // Keep order history intact: hide instead of deleting.
    await db.product.update({ where: { id }, data: { active: false } });
  } else {
    await db.product.delete({ where: { id } });
  }
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function saveCategory(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Category name is required." };
  const slug = slugify(name);
  if (await db.category.findUnique({ where: { slug } })) return { error: "That category already exists." };
  await db.category.create({
    data: { name, slug, description: String(form.get("description") ?? ""), image: String(form.get("image") ?? ""), sortOrder: await db.category.count() + 1 },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Category added." };
}

export async function updateOrder(id: string, form: FormData) {
  await requireAdmin();
  const status = String(form.get("status"));
  const paymentStatus = String(form.get("paymentStatus"));
  if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) return;
  if (!["UNPAID", "PENDING", "PAID", "FAILED"].includes(paymentStatus)) return;

  const order = await db.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
  await db.$transaction(async (tx) => {
    // Return stock when an order is cancelled (and take it back if un-cancelled).
    if (status !== order.status && (status === "CANCELLED" || order.status === "CANCELLED")) {
      const sign = status === "CANCELLED" ? 1 : -1;
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: sign * item.quantity } } });
        }
      }
    }
    await tx.order.update({ where: { id }, data: { status, paymentStatus } });
  });
  revalidatePath("/admin", "layout");
}

export async function setMessageRead(id: string, read: boolean) {
  await requireAdmin();
  await db.contactMessage.update({ where: { id }, data: { read } });
  revalidatePath("/admin", "layout");
}

export async function deleteMessage(id: string) {
  await requireAdmin();
  await db.contactMessage.delete({ where: { id } });
  revalidatePath("/admin", "layout");
}

const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,20}$/, "Codes are 3–20 letters/numbers."),
  percentOff: z.coerce.number().int().min(0).max(100),
  amountOff: z.coerce.number().int().min(0),
  minSubtotal: z.coerce.number().int().min(0),
  expiresAt: z.string().optional(),
});

export async function createCoupon(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = couponSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const c = parsed.data;
  if (c.percentOff === 0 && c.amountOff === 0) return { error: "Set a percentage or a fixed amount off." };
  if (await db.coupon.findUnique({ where: { code: c.code } })) return { error: "That code already exists." };
  await db.coupon.create({
    data: { code: c.code, percentOff: c.percentOff, amountOff: c.amountOff, minSubtotal: c.minSubtotal, expiresAt: c.expiresAt ? new Date(`${c.expiresAt}T23:59:59`) : null },
  });
  revalidatePath("/admin/coupons");
  return { ok: true, message: `Coupon ${c.code} created.` };
}

export async function toggleCoupon(id: string) {
  await requireAdmin();
  const coupon = await db.coupon.findUniqueOrThrow({ where: { id } });
  await db.coupon.update({ where: { id }, data: { active: !coupon.active } });
  revalidatePath("/admin/coupons");
}

export async function deleteCoupon(id: string) {
  await requireAdmin();
  await db.coupon.delete({ where: { id } });
  revalidatePath("/admin/coupons");
}

export async function setUserRole(id: string, role: "ADMIN" | "CUSTOMER") {
  const admin = await requireAdmin();
  if (admin.id === id) return; // can't demote yourself
  await db.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/customers");
}
