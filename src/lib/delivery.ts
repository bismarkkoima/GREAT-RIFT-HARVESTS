import "server-only";
import type { DeliverySlot } from "@prisma/client";
import { db } from "./db";

// All delivery scheduling happens in Kenya time (EAT, UTC+3, no daylight saving),
// whatever timezone the server runs in. Days are passed around as "YYYY-MM-DD" keys.

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
export const MAX_DAYS_AHEAD = 60;
// Orders for a slot close this many hours before it starts.
export const SLOT_LEAD_HOURS = 2;

export function nairobiNow() {
  const shifted = new Date(Date.now() + EAT_OFFSET_MS);
  return {
    dateKey: shifted.toISOString().slice(0, 10),
    hour: shifted.getUTCHours() + shifted.getUTCMinutes() / 60,
  };
}

export function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function addDays(dateKey: string, days: number) {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(dateKey: string, months: number) {
  const d = new Date(`${dateKey}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  // Clamp e.g. 31 Jan + 1 month to 28/29 Feb.
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}

// Delivery dates are stored as 9am Kenya time on the day.
export function dateKeyToDeliveryDate(dateKey: string) {
  return new Date(`${dateKey}T09:00:00+03:00`);
}

export function deliveryDateToKey(date: Date) {
  return new Date(date.getTime() + EAT_OFFSET_MS).toISOString().slice(0, 10);
}

function dayRange(dateKey: string) {
  return { gte: new Date(`${dateKey}T00:00:00+03:00`), lt: new Date(`${addDays(dateKey, 1)}T00:00:00+03:00`) };
}

export function formatHour(hour: number) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 || hour === 24 ? "am" : "pm"}`;
}

export function slotLabel(slot: Pick<DeliverySlot, "label" | "startHour" | "endHour">) {
  return `${slot.label} (${formatHour(slot.startHour)} – ${formatHour(slot.endHour)})`;
}

export type SlotAvailability = { id: string; label: string; remaining: number; available: boolean; reason?: string };

export async function getSlotAvailability(dateKey: string): Promise<SlotAvailability[]> {
  if (!isDateKey(dateKey)) return [];
  const now = nairobiNow();
  const slots = await db.deliverySlot.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { startHour: "asc" }] });
  const tooEarly = dateKey < now.dateKey;
  const tooLate = dateKey > addDays(now.dateKey, MAX_DAYS_AHEAD);

  const counts = await db.order.groupBy({
    by: ["deliverySlotId"],
    _count: true,
    where: { deliveryDate: dayRange(dateKey), status: { not: "CANCELLED" }, deliverySlotId: { in: slots.map((s) => s.id) } },
  });

  return slots.map((slot) => {
    const booked = counts.find((c) => c.deliverySlotId === slot.id)?._count ?? 0;
    const remaining = Math.max(0, slot.capacity - booked);
    let reason: string | undefined;
    if (tooEarly) reason = "Date has passed";
    else if (tooLate) reason = `Book up to ${MAX_DAYS_AHEAD} days ahead`;
    else if (dateKey === now.dateKey && now.hour > slot.startHour - SLOT_LEAD_HOURS) reason = "Closed for today";
    else if (remaining === 0) reason = "Fully booked";
    return { id: slot.id, label: slotLabel(slot), remaining, available: !reason, reason };
  });
}

// Validates a date + slot choice; returns an error message or the resolved slot.
export async function checkSlot(dateKey: string, slotId: string) {
  const availability = await getSlotAvailability(dateKey);
  const slot = availability.find((s) => s.id === slotId);
  if (!slot) return { error: "Please choose a delivery time." } as const;
  if (!slot.available) return { error: `That delivery time isn't available: ${slot.reason?.toLowerCase()}.` } as const;
  return { slot } as const;
}

// Orders for a whole day, grouped by slot, for the admin delivery schedule.
export async function getDeliverySchedule(dateKey: string) {
  const [slots, orders] = await Promise.all([
    db.deliverySlot.findMany({ orderBy: [{ sortOrder: "asc" }, { startHour: "asc" }] }),
    db.order.findMany({
      where: { deliveryDate: dayRange(dateKey), status: { not: "CANCELLED" } },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return { slots, orders };
}

export const FREQUENCIES = {
  WEEKLY: { label: "Every week", short: "Weekly" },
  FORTNIGHTLY: { label: "Every 2 weeks", short: "Fortnightly" },
  MONTHLY: { label: "Every month", short: "Monthly" },
} as const;
export type Frequency = keyof typeof FREQUENCIES;

export function nextOccurrence(dateKey: string, frequency: string) {
  if (frequency === "WEEKLY") return addDays(dateKey, 7);
  if (frequency === "FORTNIGHTLY") return addDays(dateKey, 14);
  return addMonths(dateKey, 1);
}
