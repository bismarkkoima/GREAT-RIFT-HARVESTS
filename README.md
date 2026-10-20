# Great Rift Harvests

Online flower shop for Great Rift Harvests: farm-fresh Kenyan roses, bouquets and wildflowers, delivered to your door.

Built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS** and **Prisma** (SQLite locally, PostgreSQL-ready).

## Features

**Storefront**
- Home page with hero, categories, featured products and customer reviews
- Shop with search, category filters, price filter and sorting
- Product pages with sizes (10-stem bundle / 100-stem box), stock levels, reviews and related products
- Slide-out cart drawer and cart page (saved in the browser)
- Checkout with delivery date, gift message, delivery zones, free delivery over Ksh 5,000 and discount codes
- **M-Pesa STK Push** payments (Safaricom Daraja) or cash on delivery
- Order confirmation page with live payment status and a delivery progress tracker
- Order tracking by order number + email
- Customer accounts: order history, wishlist, profile, password change and forgot-password reset by email
- **Email and SMS notifications**: order confirmation, out-for-delivery, delivered and cancelled updates for customers; new-order and contact-form alerts for the shop team
- Contact form, newsletter sign-up, WhatsApp chat button
- Dark mode, fully responsive, SEO metadata, sitemap, robots.txt and product structured data

**Admin dashboard** (`/admin`)
- Revenue stats, 30-day revenue chart, best sellers and low-stock alerts
- Orders: filter, search, update order/payment status (cancelling restocks items)
- Products: create, edit, hide/delete, image upload, sizes, prices and stock
- Categories, coupons, customers (grant/revoke admin), contact messages and newsletter subscribers (CSV export)

**Security**
- Passwords hashed with bcrypt; signed, HTTP-only session cookies
- Prices and stock always re-checked on the server at checkout
- Rate limiting on login, contact, newsletter and order tracking

## Getting started

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env        # then set AUTH_SECRET (openssl rand -base64 32)
npm run setup               # creates the database and loads sample products
npm run dev                 # http://localhost:3000
```

Admin sign-in after seeding uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`
(defaults: `admin@greatriftharvests.co.ke` / `ChangeMe123!`, so **change these before going live**).

Try the discount code `KARIBU10` for 10% off.

## M-Pesa

With no Daraja keys set, checkout runs in **demo mode** and M-Pesa payments are marked as paid automatically.
To take real payments, create an app at <https://developer.safaricom.co.ke>, then fill in the `MPESA_*` variables in `.env`.
`NEXT_PUBLIC_SITE_URL` must be a public HTTPS URL so Safaricom can reach `/api/mpesa/callback`.

## Email and SMS

With no keys set, emails and SMS are printed to the server log so you can see exactly what would be sent.

- **Email:** set the `SMTP_*` variables for any SMTP provider (Gmail app password, Zoho, Brevo, Resend…) and `EMAIL_FROM`.
- **SMS:** create an [Africa's Talking](https://africastalking.com) account and set `AT_USERNAME` / `AT_API_KEY` (use `AT_USERNAME="sandbox"` to test). `AT_SENDER_ID` is optional.
- **Shop alerts** go to `ADMIN_NOTIFY_EMAIL` (comma separated) or, if unset, to every admin account.

| Event | Customer | Shop team |
| --- | --- | --- |
| Order confirmed (cash, or once M-Pesa payment lands) | Email + SMS | Email |
| Status set to Processing / Delivered / Cancelled | Email | — |
| Status set to Out for delivery | Email + SMS | — |
| Contact form message | — | Email |
| Forgot password | Email with a 1-hour reset link | — |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` / `npm run typecheck` | Code checks |
| `npm run db:push` | Apply schema changes to the database |
| `npm run db:seed` | Load sample products, categories, admin and coupon |
| `npm run db:reset` | Wipe the database and reseed |

## Deploying

1. Use PostgreSQL: set `provider = "postgresql"` in `prisma/schema.prisma` and point `DATABASE_URL` at your database (Neon, Supabase, Railway…).
2. Set all variables from `.env.example` on your host.
3. Run `npm run build`, then `npx prisma db push && npm run db:seed` once.
4. Admin image uploads are saved to `public/uploads`. That works on a VPS/Railway/Render server; on serverless hosts like Vercel, switch `saveUpload` in `src/app/actions/admin.ts` to a storage service (Vercel Blob, Cloudinary, S3).

## Project structure

```
prisma/            schema.prisma, seed.ts
public/images/     product photos
src/app/           pages, server actions (src/app/actions) and API routes (src/app/api)
src/components/    UI: cart, layout, product, admin
src/lib/           database, auth, pricing, M-Pesa and helpers
```

---

© Great Rift Harvests. All rights reserved. This code is proprietary and not licensed for reuse.
