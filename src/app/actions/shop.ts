"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { ActionState } from "./types";

export async function toggleWishlist(productId: string): Promise<{ wished?: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to save favourites." };
  const existing = await db.wishlistItem.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
  } else {
    await db.wishlistItem.create({ data: { userId: user.id, productId } });
  }
  revalidatePath("/account/wishlist");
  return { wished: !existing };
}

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(5, "Please write a few words.").max(1000),
});

export async function submitReview(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to leave a review." };
  const parsed = reviewSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { productId, rating, comment } = parsed.data;

  const product = await db.product.findUnique({ where: { id: productId }, select: { slug: true } });
  if (!product) return { error: "Product not found." };

  await db.review.upsert({
    where: { productId_userId: { productId, userId: user.id } },
    update: { rating, comment },
    create: { productId, userId: user.id, rating, comment },
  });
  revalidatePath(`/shop/${product.slug}`);
  return { ok: true, message: "Thanks for your review!" };
}
