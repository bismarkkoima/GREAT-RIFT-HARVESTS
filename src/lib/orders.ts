import "server-only";
import { randomBytes } from "crypto";
import { after } from "next/server";
import { db } from "./db";
import { deliveryFeeFor } from "./pricing";
import { evaluateCoupon } from "./coupons";
import { checkSlot, dateKeyToDeliveryDate, isDateKey, nairobiNow, slotLabel } from "./delivery";
import { mpesaConfigured, stkPush } from "./mpesa";
import { notifyOrderConfirmed, notifyOrderStatus } from "./order-notifications";

// Shared order logic for checkout and subscription renewals.

export class OrderError extends Error {}

type NewOrder = {
  lines: { variantId: string; quantity: number }[];
  customer: { name: string; email: string; phone: string; address: string; city: string; giftMessage?: string | null; notes?: string | null };
  userId?: string | null;
  deliveryDateKey?: string | null;
  deliverySlotId?: string | null;
  // Checkout enforces cut-offs and capacity; renewals for existing subscribers skip the capacity check.
  enforceSlotRules?: boolean;
  paymentMethod: "MPESA" | "CASH";
  couponCode?: string | null;
  percentOff?: number;
  subscriptionId?: string | null;
};

function newOrderNumber() {
  return `GRH-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function createOrder(input: NewOrder) {
  let deliveryDate: Date | null = null;
  let slot: { id: string; label: string } | null = null;

  if (input.deliveryDateKey) {
    if (!isDateKey(input.deliveryDateKey) || input.deliveryDateKey < nairobiNow().dateKey) {
      throw new OrderError("Please choose a delivery date from today onwards.");
    }
    deliveryDate = dateKeyToDeliveryDate(input.deliveryDateKey);
    if (input.enforceSlotRules) {
      const anySlots = await db.deliverySlot.count({ where: { active: true } });
      if (anySlots > 0) {
        const checked = await checkSlot(input.deliveryDateKey, input.deliverySlotId ?? "");
        if ("error" in checked) throw new OrderError(checked.error);
        slot = { id: checked.slot.id, label: checked.slot.label };
      }
    } else if (input.deliverySlotId) {
      const s = await db.deliverySlot.findUnique({ where: { id: input.deliverySlotId } });
      if (s) slot = { id: s.id, label: slotLabel(s) };
    }
  }

  // Prices always come from the database, never from the browser.
  const variants = await db.productVariant.findMany({
    where: { id: { in: input.lines.map((l) => l.variantId) }, product: { active: true } },
    include: { product: true },
  });
  const lines = input.lines.map((l) => ({ ...l, variant: variants.find((v) => v.id === l.variantId) }));
  if (lines.some((l) => !l.variant)) throw new OrderError("Some items are no longer available. Please review your cart.");
  const short = lines.find((l) => l.variant!.stock < l.quantity);
  if (short) throw new OrderError(`Only ${short.variant!.stock} left of ${short.variant!.product.name} — ${short.variant!.label}.`);

  const subtotal = lines.reduce((n, l) => n + l.variant!.price * l.quantity, 0);
  const percentOff = Math.round((subtotal * (input.percentOff ?? 0)) / 100);
  const deliveryFee = deliveryFeeFor(input.customer.city, subtotal);

  return db.$transaction(async (tx) => {
    // Coupon rules are checked inside the transaction so usage limits can't be exceeded by concurrent orders.
    let couponOff = 0;
    let couponCode: string | null = null;
    if (input.couponCode) {
      const check = await evaluateCoupon(input.couponCode, subtotal, { email: input.customer.email, userId: input.userId }, tx);
      if (!check.ok) throw new OrderError(`Discount code: ${check.error}`);
      couponOff = check.discount;
      couponCode = check.coupon.code;
    }
    const discount = Math.min(subtotal, couponOff + percentOff);
    const total = subtotal - discount + deliveryFee;

    for (const l of lines) {
      const updated = await tx.productVariant.updateMany({
        where: { id: l.variantId, stock: { gte: l.quantity } },
        data: { stock: { decrement: l.quantity } },
      });
      if (updated.count === 0) throw new OrderError("Sorry, an item just sold out. Please review your cart.");
    }
    return tx.order.create({
      data: {
        orderNumber: newOrderNumber(),
        userId: input.userId ?? null,
        ...input.customer,
        giftMessage: input.customer.giftMessage || null,
        notes: input.customer.notes || null,
        deliveryDate,
        deliverySlotId: slot?.id ?? null,
        deliverySlotLabel: slot?.label ?? null,
        subtotal,
        discount,
        deliveryFee,
        total,
        couponCode,
        paymentMethod: input.paymentMethod,
        status: input.paymentMethod === "CASH" ? "CONFIRMED" : "PENDING",
        subscriptionId: input.subscriptionId ?? null,
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
}

// Kicks off payment for a new order: STK push for M-Pesa, or straight to confirmed for cash.
export async function startPayment(orderId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.paymentMethod === "CASH") {
    after(() => notifyOrderConfirmed(order.id));
    return;
  }
  if (!mpesaConfigured()) {
    // Simulation mode: treat the payment as successful so the full flow can be demoed.
    await db.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID", status: "CONFIRMED", mpesaReceipt: `SIM${randomBytes(4).toString("hex").toUpperCase()}` },
    });
    after(() => notifyOrderConfirmed(order.id));
    return;
  }
  try {
    const checkoutId = await stkPush({ phone: order.phone, amount: order.total, reference: order.orderNumber });
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: "PENDING", mpesaCheckoutId: checkoutId, mpesaRequestedAt: new Date(), mpesaCheckedAt: null } });
  } catch (e) {
    console.error("STK push failed", e);
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
  }
}

// Cancels an order and returns its items to stock. Shared by admin and self-service cancel.
export async function cancelOrder(orderId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (order.status === "CANCELLED") return;
  await db.$transaction(async (tx) => {
    for (const item of order.items) {
      if (item.variantId) await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  });
  after(() => notifyOrderStatus(orderId));
}

// Customers may cancel until the florists start on the order, and only if nothing has been paid.
export function customerCanCancel(order: { status: string; paymentStatus: string }) {
  return ["PENDING", "CONFIRMED"].includes(order.status) && order.paymentStatus !== "PAID";
}
