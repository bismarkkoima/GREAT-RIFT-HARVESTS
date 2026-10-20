import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const categories = [
  { name: "Bouquets", slug: "bouquets", description: "Hand-tied arrangements for every occasion.", image: "/images/elegantbouquet.webp", sortOrder: 1 },
  { name: "Roses", slug: "roses", description: "Long-stem roses grown on the shores of Lake Naivasha.", image: "/images/classicrose.webp", sortOrder: 2 },
  { name: "Wildflowers", slug: "wildflowers", description: "Free-spirited seasonal stems from the Rift Valley.", image: "/images/wildflowers.jfif", sortOrder: 3 },
  { name: "Seasonal", slug: "seasonal", description: "Limited bunches picked at their peak.", image: "/images/sunshinebouqet.jpeg", sortOrder: 4 },
];

type Seed = {
  name: string;
  slug: string;
  category: string;
  image: string;
  description: string;
  details: string;
  tags: string;
  featured?: boolean;
  small: number;
  large: number;
};

const products: Seed[] = [
  {
    name: "Elegant Bouquet",
    slug: "elegant-bouquet",
    category: "bouquets",
    image: "/images/elegantbouquet.webp",
    description: "A graceful mix of roses, lisianthus and greenery, wrapped by hand.",
    details: "Cut the morning of delivery. Trim stems at an angle and change the water every two days for 7–10 days of bloom.",
    tags: "wedding,anniversary,best-seller",
    featured: true,
    small: 1500,
    large: 13000,
  },
  {
    name: "Classic Rose",
    slug: "classic-rose",
    category: "roses",
    image: "/images/classicrose.webp",
    description: "Velvety long-stem red roses — the timeless way to say it.",
    details: "60cm stems, grown at altitude for larger heads and deeper colour.",
    tags: "romance,valentine,best-seller",
    featured: true,
    small: 2000,
    large: 18000,
  },
  {
    name: "Wild Flowers",
    slug: "wild-flowers",
    category: "wildflowers",
    image: "/images/wildflowers.jfif",
    description: "A joyful, loose gathering of seasonal wildflowers.",
    details: "Varieties change with the season, so every bunch is a little different.",
    tags: "birthday,just-because",
    featured: true,
    small: 1000,
    large: 11000,
  },
  {
    name: "Sunshine Bouquet",
    slug: "sunshine-bouquet",
    category: "seasonal",
    image: "/images/sunshinebouqet.jpeg",
    description: "Bright yellows and oranges to light up any room.",
    details: "Sunflowers, spray roses and solidago. Perfect for get-well and congratulations.",
    tags: "get-well,congratulations",
    featured: true,
    small: 1800,
    large: 15000,
  },
  {
    name: "Blush Rose Bunch",
    slug: "blush-rose-bunch",
    category: "roses",
    image: "/images/classicrose.webp",
    description: "Soft pink roses with a gentle fragrance.",
    details: "50cm stems. A favourite for bridal showers and new mothers.",
    tags: "wedding,new-baby",
    small: 1900,
    large: 17000,
  },
  {
    name: "Naivasha Garden Mix",
    slug: "naivasha-garden-mix",
    category: "bouquets",
    image: "/images/elegantbouquet.webp",
    description: "A lush, garden-style arrangement inspired by the lakeside farms.",
    details: "Includes seasonal fillers and eucalyptus for a natural look.",
    tags: "anniversary,thank-you",
    small: 2200,
    large: 19500,
  },
  {
    name: "Meadow Sunrise",
    slug: "meadow-sunrise",
    category: "wildflowers",
    image: "/images/sunshinebouqet.jpeg",
    description: "Golden meadow blooms with airy accents.",
    details: "A cheerful pick for office desks and reception areas.",
    tags: "corporate,thank-you",
    small: 1200,
    large: 12000,
  },
  {
    name: "Rift Valley Wildbunch",
    slug: "rift-valley-wildbunch",
    category: "seasonal",
    image: "/images/wildflowers.jfif",
    description: "Our florist's choice of the week's freshest stems.",
    details: "Trust our team to pick what's blooming best right now.",
    tags: "just-because,birthday",
    small: 1100,
    large: 10500,
  },
];

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@greatriftharvests.co.ke").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  await db.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: { name: "Store Admin", email: adminEmail, role: "ADMIN", passwordHash: await bcrypt.hash(adminPassword, 10) },
  });

  for (const c of categories) {
    await db.category.upsert({ where: { slug: c.slug }, update: c, create: c });
  }

  for (const p of products) {
    const category = await db.category.findUniqueOrThrow({ where: { slug: p.category } });
    const exists = await db.product.findUnique({ where: { slug: p.slug } });
    if (exists) continue;
    await db.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        details: p.details,
        image: p.image,
        gallery: JSON.stringify([p.image]),
        tags: p.tags,
        featured: p.featured ?? false,
        categoryId: category.id,
        variants: {
          create: [
            { label: "Bundle (10 stems)", stems: 10, price: p.small, stock: 200, sortOrder: 0 },
            { label: "Box (100 stems)", stems: 100, price: p.large, stock: 40, sortOrder: 1 },
          ],
        },
      },
    });
  }

  await db.coupon.upsert({
    where: { code: "KARIBU10" },
    update: {},
    create: { code: "KARIBU10", percentOff: 10, minSubtotal: 1000 },
  });

  console.log(`Seeded. Admin login: ${adminEmail} / ${process.env.ADMIN_PASSWORD ? "(from ADMIN_PASSWORD)" : adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
