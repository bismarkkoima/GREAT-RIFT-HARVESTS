"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { couponDiscount } from "@/lib/pricing";
import { normalizePhone } from "@/lib/mpesa";
import { getSlotAvailability } from "@/lib/delivery";
import { OrderError, cancelOrder, createOrder, customerCanCancel, startPayment } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionState } from "./types";

const itemsSchema = z
  .array(z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(99) }))
  .min(1, "Your cart is empty.");

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name.").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid email."),
  phone: z.string().trim().min(9, "Please enter a valid phone number."),
  address: z.string().trim().min(5, "Please enter a delivery address.").max(300),
  city: z.string().trim().min(2, "Please choose a city."),
  deliveryDate: z.string().optional(),
  deliverySlotId: z.string().optional(),
  giftMessage: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
  coupon: z.string().trim().toUpperCase().optional(),
  paymentMethod: z.enum(["MPESA", "CASH"]),
});

export async function checkCoupon(code: string, subtotal: number) {
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  const discount = couponDiscount(coupon, subtotal);
  if (!coupon || discount === 0) {
    return { error: coupon && subtotal < coupon.minSubtotal ? `Minimum order of Ksh ${coupon.minSubtotal} for this code.` : "That code isn't valid." };
  }
  return { discount, code: coupon.code };
}

export async function getDeliverySlots(dateKey: string) {
  return getSlotAvailability(dateKey);
}

export async function placeOrder(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(form.get("items") ?? "[]"));
  } catch {
    return { error: "Your cart could not be read. Please refresh and try again." };
  }
  const items = itemsSchema.safeParse(rawItems);
  if (!items.success) return { error: items.error.issues[0].message };

  const data = parsed.data;
  const phone = normalizePhone(data.phone);
  if (!phone) return { error: "Please enter a valid Kenyan phone number, e.g. 0712 345 678." };

  const user = await getCurrentUser();
  let order;
  try {
    order = await createOrder({
      lines: items.data,
      customer: { name: data.name, email: data.email, phone, address: data.address, city: data.city, giftMessage: data.giftMessage, notes: data.notes },
      userId: user?.id,
      deliveryDateKey: data.deliveryDate || null,
      deliverySlotId: data.deliverySlotId || null,
      enforceSlotRules: true,
      paymentMethod: data.paymentMethod,
      couponCode: data.coupon || null,
    });
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    throw e;
  }

  await startPayment(order.id);
  redirect(`/order/${order.token}?new=1`);
}

export async function retryPayment(token: string) {
  const order = await db.order.findUnique({ where: { token } });
  if (!order || order.paymentMethod !== "MPESA" || order.paymentStatus === "PAID" || order.status === "CANCELLED") return;
  await startPayment(order.id);
  redirect(`/order/${token}`);
}

// The order token in the URL is the customer's proof of ownership (same as viewing the order).
export async function cancelMyOrder(token: string) {
  const order = await db.order.findUnique({ where: { token } });
  if (order && customerCanCancel(order)) await cancelOrder(order.id);
  redirect(`/order/${token}`);
}

export async function trackOrder(_: ActionState, form: FormData): Promise<ActionState> {
  const orderNumber = String(form.get("orderNumber") ?? "").trim().toUpperCase();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit(`track:${ip}`, 10)) return { error: "Too many attempts. Please wait a minute." };
  const order = await db.order.findFirst({ where: { orderNumber, email } });
  if (!order) return { error: "We couldn't find an order with those details." };
  redirect(`/order/${order.token}`);
}
