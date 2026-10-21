import "server-only";
import { after } from "next/server";
import { db } from "./db";
import { mpesaConfigured, stkQuery } from "./mpesa";
import { notifyOrderConfirmed } from "./order-notifications";

// M-Pesa payment state changes. The callback, the status poll, the admin button and the
// background sweep can all race, so every change is a conditional update and the
// customer is only notified by the one that actually flips the order to paid.

export async function markMpesaPaid(orderId: string, receipt: string | null) {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order) return false;
  const updated = await db.order.updateMany({
    // FAILED is included: a late callback can still prove the customer paid.
    where: { id: orderId, paymentStatus: { in: ["PENDING", "FAILED"] } },
    data: {
      paymentStatus: "PAID",
      status: order.status === "PENDING" ? "CONFIRMED" : order.status,
      ...(receipt ? { mpesaReceipt: receipt } : {}),
    },
  });
  if (updated.count > 0) after(() => notifyOrderConfirmed(orderId));
  return updated.count > 0;
}

export async function markMpesaFailed(orderId: string) {
  const updated = await db.order.updateMany({ where: { id: orderId, paymentStatus: "PENDING" }, data: { paymentStatus: "FAILED" } });
  return updated.count > 0;
}

// Give the customer time to enter their PIN before asking Safaricom, and don't ask too often.
const MIN_AGE_MS = 30_000;
const MIN_INTERVAL_MS = 15_000;
// A prompt nobody answered is treated as failed after this long (the customer can retry).
const GIVE_UP_MS = 15 * 60_000;

// `force` (admin button) skips the waiting rules.
export async function reconcileMpesaPayment(orderId: string, { force = false } = {}) {
  if (!mpesaConfigured()) return;
  const now = Date.now();
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentMethod !== "MPESA" || order.paymentStatus !== "PENDING" || !order.mpesaCheckoutId) return;
  const requestedAt = (order.mpesaRequestedAt ?? order.createdAt).getTime();
  if (!force && now - requestedAt < MIN_AGE_MS) return;

  // Claim this check so concurrent pollers don't all call Safaricom.
  const claimed = await db.order.updateMany({
    where: {
      id: orderId,
      paymentStatus: "PENDING",
      ...(force ? {} : { OR: [{ mpesaCheckedAt: null }, { mpesaCheckedAt: { lt: new Date(now - MIN_INTERVAL_MS) } }] }),
    },
    data: { mpesaCheckedAt: new Date(now) },
  });
  if (claimed.count === 0) return;

  try {
    const result = await stkQuery(order.mpesaCheckoutId);
    if (result.state === "PAID") await markMpesaPaid(orderId, null);
    else if (result.state === "FAILED") await markMpesaFailed(orderId);
    else if (now - requestedAt > GIVE_UP_MS) await markMpesaFailed(orderId);
  } catch (e) {
    console.error(`M-Pesa status check failed for ${order.orderNumber}`, e);
  }
}

// Background sweep for pending M-Pesa orders whose customers have left the page.
export async function reconcilePendingPayments() {
  const pending = await db.order.findMany({
    where: { paymentMethod: "MPESA", paymentStatus: "PENDING", mpesaCheckoutId: { not: null }, createdAt: { gt: new Date(Date.now() - 24 * 3600_000) } },
    select: { id: true },
    take: 100,
  });
  for (const o of pending) await reconcileMpesaPayment(o.id);
  // Anything still pending after a day was never going to complete.
  const expired = await db.order.updateMany({
    where: { paymentMethod: "MPESA", paymentStatus: "PENDING", createdAt: { lte: new Date(Date.now() - 24 * 3600_000) } },
    data: { paymentStatus: "FAILED" },
  });
  return { checked: pending.length, expired: expired.count };
}
