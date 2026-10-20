"use client";

import { saveCategory } from "@/app/actions/admin";
import { useFormAction } from "@/components/ui/use-form-action";

export function CategoryForm() {
  const [state, action, pending] = useFormAction(saveCategory, { resetOnSuccess: true });
  return (
    <form onSubmit={action} className="card space-y-4 p-6">
      <input name="name" required placeholder="Name" className="input" aria-label="Name" />
      <input name="description" placeholder="Description" className="input" aria-label="Description" />
      <input name="image" placeholder="Image path, e.g. /images/wildflowers.jfif" className="input" aria-label="Image" />
      {state?.error && <p className="text-sm text-blush-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-brand-700">{state.message}</p>}
      <button disabled={pending} className="btn-primary">Add category</button>
    </form>
  );
}
