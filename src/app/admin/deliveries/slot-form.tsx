"use client";

import { saveDeliverySlot } from "@/app/actions/admin";
import { useFormAction } from "@/components/ui/use-form-action";

type Slot = { id: string; label: string; startHour: number; endHour: number; capacity: number; active: boolean };

export function SlotForm({ slot }: { slot?: Slot }) {
  const [state, action, pending] = useFormAction(saveDeliverySlot, { resetOnSuccess: !slot });
  return (
    <form onSubmit={action} className={`card space-y-3 p-5 ${slot ? "" : "border-dashed"}`}>
      {slot && <input type="hidden" name="id" value={slot.id} />}
      <p className="font-semibold">{slot ? slot.label : "Add a slot"}</p>
      <input name="label" defaultValue={slot?.label} required placeholder="e.g. Late evening" className="input" aria-label="Slot name" />
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-stone-500">From (hour)<input name="startHour" type="number" min={0} max={23} defaultValue={slot?.startHour ?? 8} className="input mt-1" /></label>
        <label className="text-xs text-stone-500">To (hour)<input name="endHour" type="number" min={1} max={24} defaultValue={slot?.endHour ?? 12} className="input mt-1" /></label>
        <label className="text-xs text-stone-500">Max orders<input name="capacity" type="number" min={0} defaultValue={slot?.capacity ?? 20} className="input mt-1" /></label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={slot?.active ?? true} className="h-4 w-4 accent-brand-700" /> Offered to customers</label>
      {state?.error && <p className="text-sm text-blush-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-brand-700 dark:text-brand-400">{state.message}</p>}
      <button disabled={pending} className="btn-secondary w-full">{slot ? "Save" : "Add slot"}</button>
    </form>
  );
}
