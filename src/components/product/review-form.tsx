"use client";

import { useState } from "react";
import { submitReview } from "@/app/actions/shop";
import { StarIcon } from "@/components/ui/icons";
import { useFormAction } from "@/components/ui/use-form-action";

export function ReviewForm({ productId }: { productId: string }) {
  const [state, action, pending] = useFormAction(submitReview);
  const [rating, setRating] = useState(5);
  if (state?.ok) return <p className="card p-4 text-brand-700 dark:text-brand-300">{state.message}</p>;
  return (
    <form onSubmit={action} className="card space-y-4 p-6">
      <h3 className="text-lg">Write a review</h3>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1 text-amber-500" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} stars`} onClick={() => setRating(i)}>
            <StarIcon filled={rating >= i} width={26} height={26} />
          </button>
        ))}
      </div>
      <textarea name="comment" required minLength={5} rows={3} className="input" placeholder="How were your flowers?" />
      {state?.error && <p className="text-sm text-blush-600">{state.error}</p>}
      <button disabled={pending} className="btn-primary">{pending ? "Posting…" : "Post review"}</button>
    </form>
  );
}
