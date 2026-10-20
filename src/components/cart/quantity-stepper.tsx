"use client";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  size = "md",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <div className="inline-flex items-center rounded-full border border-stone-300 dark:border-stone-700">
      <button type="button" aria-label="Decrease quantity" className={`${pad} rounded-full text-lg hover:bg-stone-100 dark:hover:bg-stone-800`} onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button type="button" aria-label="Increase quantity" className={`${pad} rounded-full text-lg hover:bg-stone-100 dark:hover:bg-stone-800`} onClick={() => onChange(Math.min(99, value + 1))}>
        +
      </button>
    </div>
  );
}
