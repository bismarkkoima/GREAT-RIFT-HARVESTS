import { StarIcon } from "@/components/ui/icons";

export function Stars({ rating, count }: { rating: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-amber-500" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} filled={rating >= i - 0.25} />
      ))}
      {count !== undefined && <span className="ml-1 text-xs text-stone-500">({count})</span>}
    </span>
  );
}
