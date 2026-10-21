import "server-only";
import type { Coupon, Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";
import { couponDiscount } from "./pricing";
import { formatKsh } from "./format";

type Client = PrismaClient | Prisma.TransactionClient;

export type CouponCheck = { ok: true; coupon: Coupon; discount: number } | { ok: false; error: string };

// Checks a code against all its rules. `email`/`userId` identify the customer for the
// per-customer and first-order rules; without them only the general rules are checked
// (used for the checkout preview before an email is typed).
export async function evaluateCoupon(
  code: string,
  subtotal: number,
  customer: { email?: string | null; userId?: string | null } = {},
  client: Client = db,
): Promise<CouponCheck> {
  const coupon = await client.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon || !coupon.active) return { ok: false, error: "That code isn't valid." };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { ok: false, error: "That code has expired." };
  if (subtotal < coupon.minSubtotal) return { ok: false, error: `This code needs an order of at least ${formatKsh(coupon.minSubtotal)}.` };

  const redeemed = { couponCode: coupon.code, status: { not: "CANCELLED" } };
  if (coupon.maxUses !== null && (await client.order.count({ where: redeemed })) >= coupon.maxUses) {
    return { ok: false, error: "This code has been fully redeemed." };
  }

  const email = customer.email?.trim().toLowerCase();
  const who = [...(email ? [{ email }] : []), ...(customer.userId ? [{ userId: customer.userId }] : [])];
  if (who.length > 0) {
    if (coupon.perCustomer !== null && (await client.order.count({ where: { ...redeemed, OR: who } })) >= coupon.perCustomer) {
      return { ok: false, error: "You've already used this code." };
    }
    if (coupon.firstOrderOnly && (await client.order.count({ where: { status: { not: "CANCELLED" }, OR: who } })) > 0) {
      return { ok: false, error: "This code is for first orders only." };
    }
  }

  const discount = couponDiscount(coupon, subtotal);
  if (discount === 0) return { ok: false, error: "That code isn't valid for this order." };
  return { ok: true, coupon, discount };
}
