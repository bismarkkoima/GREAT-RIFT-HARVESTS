"use client";

import { useRef, useState, useTransition } from "react";
import { getDeliverySlots } from "@/app/actions/checkout";

type Slot = { id: string; label: string; remaining: number; available: boolean; reason?: string };

// Date + time-slot chooser. Submits `deliveryDate` (YYYY-MM-DD) and `deliverySlotId`.
export function DeliveryPicker({
  minDate,
  maxDate,
  required = false,
  dateLabel = "Delivery date",
}: {
  minDate: string;
  maxDate: string;
  required?: boolean;
  dateLabel?: string;
}) {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotId, setSlotId] = useState("");
  const [loading, startLoading] = useTransition();
  const latestDate = useRef("");

  const chooseDate = (next: string) => {
    setDate(next);
    setSlotId("");
    setSlots(null);
    latestDate.current = next;
    if (!next) return;
    startLoading(async () => {
      const result = await getDeliverySlots(next);
      if (latestDate.current !== next) return; // a newer date was picked meanwhile
      setSlots(result);
      const first = result.find((s) => s.available);
      if (first) setSlotId(first.id);
    });
  };

  const noneAvailable = slots && slots.length > 0 && !slots.some((s) => s.available);

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="sm:w-1/2 sm:pr-2">
        <label className="label" htmlFor="deliveryDate">{dateLabel}</label>
        <input
          id="deliveryDate"
          name="deliveryDate"
          type="date"
          min={minDate}
          max={maxDate}
          required={required}
          value={date}
          onChange={(e) => chooseDate(e.target.value)}
          className="input"
        />
        {!date && !required && <p className="mt-1 text-xs text-stone-500">Leave empty for delivery as soon as possible.</p>}
      </div>
      <input type="hidden" name="deliverySlotId" value={slotId} />
      {date && (
        <fieldset>
          <legend className="label">Delivery time</legend>
          {loading && !slots ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-stone-100 dark:bg-stone-800" />)}
            </div>
          ) : slots && slots.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {slots.map((s) => (
                <label
                  key={s.id}
                  className={`rounded-2xl border-2 p-3 text-sm transition ${
                    !s.available
                      ? "cursor-not-allowed border-stone-200 opacity-50 dark:border-stone-800"
                      : s.id === slotId
                        ? "cursor-pointer border-brand-600 bg-brand-50 dark:bg-brand-950"
                        : "cursor-pointer border-stone-200 hover:border-stone-300 dark:border-stone-700"
                  }`}
                >
                  <input type="radio" name="slotChoice" value={s.id} className="sr-only" checked={s.id === slotId} disabled={!s.available} onChange={() => setSlotId(s.id)} />
                  <span className="block font-semibold">{s.label}</span>
                  <span className="text-xs text-stone-500">
                    {s.available ? (s.remaining <= 5 ? `Only ${s.remaining} left` : "Available") : s.reason}
                  </span>
                </label>
              ))}
            </div>
          ) : null}
          {noneAvailable && <p className="mt-2 text-sm text-blush-600">No delivery times left on this day. Please pick another date.</p>}
        </fieldset>
      )}
    </div>
  );
}
