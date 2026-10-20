"use server";

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { couponDiscount, deliveryFeeFor } from "@/lib/pricing";
import { mpesaConfigured, normalizePhone, stkPush } from "@/lib/mpesa";
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
  giftMessage: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
  coupon: z.string().trim().toUpperCase().optional(),
  paymentMethod: z.enum(["MPESA", "CASH"]),
});

function newOrderNumber() {
  return `GRH-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function checkCoupon(code: string, subtotal: number) {
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  const discount = couponDiscount(coupon, subtotal);
  if (!coupon || discount === 0) {
    return { error: coupon && subtotal < coupon.minSubtotal ? `Minimum order of Ksh ${coupon.minSubtotal} for this code.` : "That code isn't valid." };
  }
  return { discount, code: coupon.code };
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

  let deliveryDate: Date | null = null;
  if (data.deliveryDate) {
    deliveryDate = new Date(`${data.deliveryDate}T09:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(deliveryDate.getTime()) || deliveryDate < today) return { error: "Please choose a delivery date from today onwards." };
  }

  // Prices always come from the database, never from the browser.
  const variants = await db.productVariant.findMany({
    where: { id: { in: items.data.map((i) => i.variantId) }, product: { active: true } },
    include: { product: true },
  });
  const lines = items.data.map((i) => ({ ...i, variant: variants.find((v) => v.id === i.variantId) }));
  const missing = lines.find((l) => !l.variant);
  if (missing) return { error: "Some items in your cart are no longer available. Please review your cart." };
  const short = lines.find((l) => l.variant!.stock < l.quantity);
  if (short) return { error: `Only ${short.variant!.stock} left of ${short.variant!.product.name} — ${short.variant!.label}.` };

  const subtotal = lines.reduce((n, l) => n + l.variant!.price * l.quantity, 0);
  const coupon = data.coupon ? await db.coupon.findUnique({ where: { code: data.coupon } }) : null;
  const discount = couponDiscount(coupon, subtotal);
  const deliveryFee = deliveryFeeFor(data.city, subtotal);
  const total = subtotal - discount + deliveryFee;
  const user = await getCurrentUser();

  let order;
  try {
    order = await db.$transaction(async (tx) => {
      for (const l of lines) {
        const updated = await tx.productVariant.updateMany({
          where: { id: l.variantId, stock: { gte: l.quantity } },
          data: { stock: { decrement: l.quantity } },
        });
        if (updated.count === 0) throw new Error("OUT_OF_STOCK");
      }
      return tx.order.create({
        data: {
          orderNumber: newOrderNumber(),
          userId: user?.id,
          name: data.name,
          email: data.email,
          phone,
          address: data.address,
          city: data.city,
          deliveryDate,
          giftMessage: data.giftMessage || null,
          notes: data.notes || null,
          subtotal,
          discount,
          deliveryFee,
          total,
          couponCode: discount > 0 ? coupon!.code : null,
          paymentMethod: data.paymentMethod,
          status: data.paymentMethod === "CASH" ? "CONFIRMED" : "PENDING",
          items: {
            create: lines.map((l) => ({
              productId: l.variant!.productId,
              variantId: l.variantId,
              name: l.variant!.product.name,
              variantLabel: l.variant!.label,
              image: l.variant!.product.image,
              price: l.variant!.price,
              quantity: l.quantity,
            })),
          },
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "OUT_OF_STOCK") {
      return { error: "Sorry, an item just sold out. Please review your cart." };
    }
    throw e;
  }

  if (data.paymentMethod === "MPESA") {
    await requestMpesaPayment(order.id);
  }
  redirect(`/order/${order.token}?new=1`);
}

async function requestMpesaPayment(orderId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!mpesaConfigured()) {
    // Simulation mode: treat the payment as successful so the full flow can be demoed.
    await db.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID", status: "CONFIRMED", mpesaReceipt: `SIM${randomBytes(4).toString("hex").toUpperCase()}` },
    });
    return;
  }
  try {
    const checkoutId = await stkPush({ phone: order.phone, amount: order.total, reference: order.orderNumber });
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: "PENDING", mpesaCheckoutId: checkoutId } });
  } catch (e) {
    console.error("STK push failed", e);
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
  }
}

export async function retryPayment(token: string) {
  const order = await db.order.findUnique({ where: { token } });
  if (!order || order.paymentMethod !== "MPESA" || order.paymentStatus === "PAID" || order.status === "CANCELLED") return;
  await requestMpesaPayment(order.id);
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
