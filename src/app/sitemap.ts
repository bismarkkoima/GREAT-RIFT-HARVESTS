import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const products = await db.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } });
  return [
    ...["", "/shop", "/about", "/contact", "/track"].map((p) => ({ url: `${site}${p}`, changeFrequency: "weekly" as const })),
    ...products.map((p) => ({ url: `${site}/shop/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
