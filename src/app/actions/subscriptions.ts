"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { normalizePhone } from "@/lib/mpesa";
import {
  FREQUENCIES,
  MAX_DAYS_AHEAD,
  addDays,
  checkSlot,
  dateKeyToDeliveryDate,
  deliveryDateToKey,
  isDateKey,
  nairobiNow,
  nextOccurrence,
} from "@/lib/delivery";
import { SUBSCRIPTION_DISCOUNT, processDueSubscriptions, processSubscriptionIfDue } from "@/lib/subscriptions";
import { sendEmail } from "@/lib/notify";
import { subscriptionStartedEmail } from "@/lib/emails";
import { formatDayLong } from "@/lib/format";
import type { ActionState } from "./types";

const subscriptionSchema = z.object({
  variantId: z.string().min(1, "Please choose your flowers."),
  quantity: z.coerce.number().int().min(1).max(10),
  frequency: z.enum(Object.keys(FREQUENCIES) as [keyof typeof FREQUENCIES, ...(keyof typeof FREQUENCIES)[]]),
  deliveryDate: z.string().min(1, "Please choose your first delivery date."),
  deliverySlotId: z.string().min(1, "Please choose a delivery time."),
  name: z.string().trim().min(2, "Please enter the recipient's name.").max(100),
  phone: z.string().trim().min(9, "Please enter a valid phone number."),
  address: z.string().trim().min(5, "Please enter a delivery address.").max(300),
  city: z.string().trim().min(2, "Please choose a town."),
  giftMessage: z.string().trim().max(300).optional(),
  paymentMethod: z.enum(["MPESA", "CASH"]),
});

export async function createSubscription(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to start a subscription." };
  const parsed = subscriptionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const phone = normalizePhone(data.phone);
  if (!phone) return { error: "Please enter a valid Kenyan phone number, e.g. 0712 345 678." };

  const today = nairobiNow().dateKey;
  if (!isDateKey(data.deliveryDate) || data.deliveryDate < today || data.deliveryDate > addDays(today, MAX_DAYS_AHEAD)) {
    return { error: "Please choose a first delivery date within the next two months." };
  }
  const slot = await checkSlot(data.deliveryDate, data.deliverySlotId);
  if ("error" in slot) return { error: slot.error };

  const variant = await db.productVariant.findFirst({ where: { id: data.variantId, product: { active: true } }, include: { product: true } });
  if (!variant) return { error: "Those flowers are no longer available." };

  const sub = await db.subscription.create({
    data: {
      userId: user.id,
      productId: variant.productId,
      variantId: variant.id,
      quantity: data.quantity,
      frequency: data.frequency,
      discountPercent: SUBSCRIPTION_DISCOUNT,
      nextDeliveryDate: dateKeyToDeliveryDate(data.deliveryDate),
      deliverySlotId: data.deliverySlotId,
      name: data.name,
      phone,
      address: data.address,
      city: data.city,
      giftMessage: data.giftMessage || null,
      paymentMethod: data.paymentMethod,
    },
    include: { product: true, variant: true },
  });

  const email = subscriptionStartedEmail(sub, formatDayLong(dateKeyToDeliveryDate(data.deliveryDate)));
  after(() => sendEmail({ to: user.email, ...email }));
  // A first delivery today or tomorrow gets its order straight away.
  await processSubscriptionIfDue(sub.id);
  redirect("/account/subscriptions?started=1");
}

async function ownSubscription(id: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/subscriptions");
  const sub = await db.subscription.findFirst({ where: { id, userId: user.id } });
  if (!sub) redirect("/account/subscriptions");
  return sub;
}

function done() {
  revalidatePath("/account/subscriptions");
  revalidatePath("/admin/subscriptions");
}

export async function pauseSubscription(id: string) {
  const sub = await ownSubscription(id);
  if (sub.status === "ACTIVE") await db.subscription.update({ where: { id }, data: { status: "PAUSED" } });
  done();
}

export async function resumeSubscription(id: string) {
  const sub = await ownSubscription(id);
  if (sub.status !== "PAUSED") return done();
  // Deliveries that fell due while paused are skipped, not delivered late.
  let next = deliveryDateToKey(sub.nextDeliveryDate);
  const tomorrow = addDays(nairobiNow().dateKey, 1);
  while (next < tomorrow) next = nextOccurrence(next, sub.frequency);
  await db.subscription.update({ where: { id }, data: { status: "ACTIVE", nextDeliveryDate: dateKeyToDeliveryDate(next), lastError: null } });
  done();
}

export async function skipNextDelivery(id: string) {
  const sub = await ownSubscription(id);
  if (sub.status === "CANCELLED") return done();
  const next = nextOccurrence(deliveryDateToKey(sub.nextDeliveryDate), sub.frequency);
  // Guard against a renewal run moving the date at the same moment.
  await db.subscription.updateMany({
    where: { id, nextDeliveryDate: sub.nextDeliveryDate },
    data: { nextDeliveryDate: dateKeyToDeliveryDate(next), lastError: null },
  });
  done();
}

export async function cancelSubscription(id: string) {
  const sub = await ownSubscription(id);
  if (sub.status !== "CANCELLED") await db.subscription.update({ where: { id }, data: { status: "CANCELLED" } });
  done();
}

export async function runRenewalsNow(): Promise<void> {
  await requireAdmin();
  const results = await processDueSubscriptions();
  console.log("Manual subscription run:", results);
  revalidatePath("/admin", "layout");
}

export async function adminSetSubscriptionStatus(id: string, status: "ACTIVE" | "PAUSED" | "CANCELLED") {
  await requireAdmin();
  await db.subscription.update({ where: { id }, data: { status } });
  revalidatePath("/admin/subscriptions");
}
