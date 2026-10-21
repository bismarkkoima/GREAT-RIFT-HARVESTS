import "server-only";
import type { Subscription } from "@prisma/client";
import { db } from "./db";
import { addDays, dateKeyToDeliveryDate, deliveryDateToKey, nairobiNow, nextOccurrence } from "./delivery";
import { OrderError, createOrder, startPayment } from "./orders";
import { adminRecipients, sendEmail } from "./notify";
import { subscriptionRenewalFailedEmail } from "./emails";

export const SUBSCRIPTION_DISCOUNT = 10; // percent off every subscription delivery

// Orders are created the day before delivery, so florists can prepare and M-Pesa prompts go out in time.
export const RENEWAL_LEAD_DAYS = 1;

type Result = { id: string; outcome: "created" | "skipped" | "failed"; detail?: string };

async function renew(sub: Subscription): Promise<Result> {
  const today = nairobiNow().dateKey;
  const dueKey = deliveryDateToKey(sub.nextDeliveryDate);
  // A missed run delivers as soon as possible rather than on a past date.
  const deliveryKey = dueKey < today ? today : dueKey;
  const followingKey = nextOccurrence(deliveryKey, sub.frequency);

  // Claim this delivery: only one runner can move nextDeliveryDate forward.
  const claimed = await db.subscription.updateMany({
    where: { id: sub.id, status: "ACTIVE", nextDeliveryDate: sub.nextDeliveryDate },
    data: { nextDeliveryDate: dateKeyToDeliveryDate(followingKey) },
  });
  if (claimed.count === 0) return { id: sub.id, outcome: "skipped", detail: "already processed" };

  // Never deliver the same subscription twice on one day (e.g. after a manual date change).
  const existing = await db.order.findFirst({
    where: {
      subscriptionId: sub.id,
      status: { not: "CANCELLED" },
      deliveryDate: { gte: new Date(`${deliveryKey}T00:00:00+03:00`), lt: new Date(`${addDays(deliveryKey, 1)}T00:00:00+03:00`) },
    },
  });
  if (existing) return { id: sub.id, outcome: "skipped", detail: `already has ${existing.orderNumber}` };

  const user = await db.user.findUniqueOrThrow({ where: { id: sub.userId }, select: { email: true } });
  try {
    const order = await createOrder({
      lines: [{ variantId: sub.variantId, quantity: sub.quantity }],
      customer: { name: sub.name, email: user.email, phone: sub.phone, address: sub.address, city: sub.city, giftMessage: sub.giftMessage },
      userId: sub.userId,
      deliveryDateKey: deliveryKey,
      deliverySlotId: sub.deliverySlotId,
      enforceSlotRules: false,
      paymentMethod: sub.paymentMethod === "CASH" ? "CASH" : "MPESA",
      percentOff: sub.discountPercent,
      subscriptionId: sub.id,
    });
    await db.subscription.update({ where: { id: sub.id }, data: { lastError: null } });
    await startPayment(order.id);
    return { id: sub.id, outcome: "created", detail: order.orderNumber };
  } catch (e) {
    const message = e instanceof OrderError ? e.message : "Unexpected error creating the order";
    if (!(e instanceof OrderError)) console.error(`Subscription ${sub.id} renewal failed`, e);
    // Put the delivery back so it is retried on the next run, and flag it for the shop team.
    await db.subscription.update({ where: { id: sub.id }, data: { nextDeliveryDate: sub.nextDeliveryDate, lastError: message } });
    const msg = subscriptionRenewalFailedEmail(sub, deliveryKey, message);
    await Promise.all((await adminRecipients()).map((to) => sendEmail({ to, ...msg })));
    return { id: sub.id, outcome: "failed", detail: message };
  }
}

export async function processDueSubscriptions() {
  const cutoff = new Date(`${addDays(nairobiNow().dateKey, RENEWAL_LEAD_DAYS + 1)}T00:00:00+03:00`);
  const due = await db.subscription.findMany({ where: { status: "ACTIVE", nextDeliveryDate: { lt: cutoff } }, orderBy: { nextDeliveryDate: "asc" } });
  const results: Result[] = [];
  for (const sub of due) results.push(await renew(sub));
  return results;
}

export async function processSubscriptionIfDue(id: string) {
  const sub = await db.subscription.findUnique({ where: { id } });
  if (!sub || sub.status !== "ACTIVE") return null;
  const cutoff = addDays(nairobiNow().dateKey, RENEWAL_LEAD_DAYS);
  if (deliveryDateToKey(sub.nextDeliveryDate) > cutoff) return null;
  return renew(sub);
}
