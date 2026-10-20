import type { Coupon } from "@prisma/client";

export const FREE_DELIVERY_THRESHOLD = 5000;

// Flat delivery fees in Ksh by city; anywhere else uses the default.
export const DELIVERY_ZONES: Record<string, number> = {
  Nairobi: 300,
  Nakuru: 200,
  Naivasha: 150,
  Eldoret: 400,
  Kisumu: 450,
  Mombasa: 600,
};
export const DEFAULT_DELIVERY_FEE = 500;

export function deliveryFeeFor(city: string, subtotal: number) {
  if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
  return DELIVERY_ZONES[city] ?? DEFAULT_DELIVERY_FEE;
}

export function couponDiscount(coupon: Coupon | null, subtotal: number) {
  if (!coupon || !coupon.active) return 0;
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return 0;
  if (subtotal < coupon.minSubtotal) return 0;
  const discount = Math.round((subtotal * coupon.percentOff) / 100) + coupon.amountOff;
  return Math.min(discount, subtotal);
}
