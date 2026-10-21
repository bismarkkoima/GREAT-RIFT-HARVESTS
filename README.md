# Great Rift Harvests

Online flower shop for Great Rift Harvests: farm-fresh Kenyan roses, bouquets and wildflowers, delivered to your door.

Built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS** and **Prisma** (SQLite locally, PostgreSQL-ready).

## Features

**Storefront**
- Home page with hero, categories, featured products and customer reviews
- Shop with search, category filters, price filter and sorting
- Product pages with sizes (10-stem bundle / 100-stem box), stock levels, reviews and related products
- Slide-out cart drawer and cart page (saved in the browser)
- Checkout with gift message, delivery zones, free delivery over Ksh 5,000 and discount codes
- **Delivery time slots** (morning / afternoon / evening) with daily limits and same-day cut-offs in Kenya time
- **Flower subscriptions**: weekly, fortnightly or monthly deliveries at 10% off; customers can pause, skip or cancel anytime
- Customers can cancel an order themselves until it is being prepared
- **M-Pesa STK Push** payments (Safaricom Daraja) or cash on delivery
- Order confirmation page with live payment status and a delivery progress tracker
- Order tracking by order number + email
- Customer accounts: order history, wishlist, profile, password change and forgot-password reset by email
- **Email and SMS notifications**: order confirmation, out-for-delivery, delivered and cancelled updates for customers; new-order and contact-form alerts for the shop team
- Contact form, newsletter sign-up, WhatsApp chat button
- Dark mode, fully responsive, SEO metadata, sitemap, robots.txt and product structured data
- Installable on phones (web app manifest, app icon, offline page) and an **Android app** (see below)

**Admin dashboard** (`/admin`)
- Revenue stats, 30-day revenue chart, best sellers and low-stock alerts
- Orders: filter, search, update order/payment status (cancelling restocks items), export to CSV
- Deliveries: day-by-day run sheet grouped by time slot (printable), and slot settings (times, daily limit, on/off)
- Subscriptions: all subscribers, next deliveries, monthly recurring revenue, failed renewals, and a "create due orders now" button
- Coupons: percentage or fixed amount, minimum order, expiry, total-use and per-customer limits, first-order-only codes
- Products: create, edit, hide/delete, image upload, sizes, prices and stock
- Categories, customers (grant/revoke admin), contact messages and newsletter subscribers (CSV export)

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

Try the discount code `KARIBU10` for 10% off a first order.

## M-Pesa

With no Daraja keys set, checkout runs in **demo mode** and M-Pesa payments are marked as paid automatically.
To take real payments, create an app at <https://developer.safaricom.co.ke>, then fill in the `MPESA_*` variables in `.env`.
`NEXT_PUBLIC_SITE_URL` must be a public HTTPS URL so Safaricom can reach `/api/mpesa/callback`.

If Safaricom's callback is slow or never arrives, the store asks Safaricom for the payment status itself:
- while the customer is on the order page (after 30 seconds, at most every 15 seconds);
- from the admin order page (**Check M-Pesa status now**);
- from a background sweep, `GET /api/cron/payments` with `Authorization: Bearer $CRON_SECRET`. Run it every 5–10 minutes where your host allows (Vercel's free plan only allows daily jobs, so `vercel.json` runs it once a day as a safety net).

A prompt nobody answers is marked failed after 15 minutes, and the customer can retry. A late "paid" callback still marks the order paid.

## Delivery slots and subscriptions

Delivery slots live in the admin under **Deliveries**. Each slot has a start and end hour (Kenya time) and a maximum number of orders per day. Customers can't book a slot that is full or that starts within 2 hours.

Subscription orders are created **the day before each delivery** by a daily job, so the florists can prepare and M-Pesa prompts go out in time. Run it once a day:

- **Vercel:** `vercel.json` already schedules it at 8am Kenya time; just set `CRON_SECRET`.
- **Any other host:** call it from a cron job, e.g. `curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/subscriptions`.
- Or press **Create due orders now** on the admin Subscriptions page.

If a renewal fails (for example, the flowers are out of stock), the delivery is kept, the problem shows on the Subscriptions page, the shop team gets an email, and it is retried on the next run.

## Email and SMS

With no keys set, emails and SMS are printed to the server log so you can see exactly what would be sent.

- **Email:** set the `SMTP_*` variables for any SMTP provider (Gmail app password, Zoho, Brevo, Resend…) and `EMAIL_FROM`.
- **SMS:** create an [Africa's Talking](https://africastalking.com) account and set `AT_USERNAME` / `AT_API_KEY` (use `AT_USERNAME="sandbox"` to test). `AT_SENDER_ID` is optional.
- **Shop alerts** go to `ADMIN_NOTIFY_EMAIL` (comma separated) or, if unset, to every admin account.

| Event | Customer | Shop team |
| --- | --- | --- |
| Order confirmed (cash, or once M-Pesa payment lands) | Email + SMS | Email |
| Subscription started | Email | — |
| Subscription renewal failed | — | Email |
| Status set to Processing / Delivered / Cancelled | Email | — |
| Status set to Out for delivery | Email + SMS | — |
| Contact form message | — | Email |
| Forgot password | Email with a 1-hour reset link | — |

## Android app

`mobile/` holds an Android app (built with [Capacitor](https://capacitorjs.com)) that opens the store full-screen with its own icon and splash screen. It shows the live website, so every website update appears in the app without reinstalling.

**Get the APK (no Android Studio needed):** every push that changes `mobile/` builds a test APK on GitHub. Open the repository on GitHub → **Actions** → **Android APK** → the latest run → **Artifacts** → `great-rift-harvests-apk`. Unzip it, copy the `.apk` to an Android phone and open it (allow "install unknown apps" when asked).

**Which address the app opens:**
- **Built in:** run the workflow by hand (Actions → Android APK → Run workflow) and enter the store address, or set a repository variable `APP_URL` (Settings → Secrets and variables → Actions → Variables).
- **Not set:** the app shows a setup screen on first launch where you type the address. It remembers it; if the store can't be reached, the error screen lets you change it.

**Testing against your computer:** run `npm run dev -- -H 0.0.0.0`, find the computer's Wi-Fi address (e.g. `192.168.1.20`), put the phone on the same Wi-Fi and enter `http://192.168.1.20:3000` in the app. Plain `http://` only works in these test builds.

**Building on your own machine:** install Android Studio, then:

```bash
cd mobile
npm install
APP_URL=https://your-store.example npm run apk   # APK lands in android/app/build/outputs/apk/debug/
```

To change the app icon or splash screen, edit `brand/leaf.svg`, run `node brand/make-icons.mjs`, then `cd mobile && npm run assets`. Publishing on Google Play needs a signed release build (`./gradlew bundleRelease` with your own upload key) instead of the test APK.

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
