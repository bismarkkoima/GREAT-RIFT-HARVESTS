import { db } from "./db";

export const productCardInclude = {
  variants: { orderBy: { sortOrder: "asc" as const } },
  category: true,
  reviews: { select: { rating: true } },
};

export type ProductCardData = Awaited<ReturnType<typeof getFeaturedProducts>>[number];

export function getFeaturedProducts(take = 4) {
  return db.product.findMany({
    where: { active: true, featured: true },
    include: productCardInclude,
    orderBy: { createdAt: "asc" },
    take,
  });
}

export function averageRating(reviews: { rating: number }[]) {
  if (reviews.length === 0) return 0;
  return reviews.reduce((n, r) => n + r.rating, 0) / reviews.length;
}
