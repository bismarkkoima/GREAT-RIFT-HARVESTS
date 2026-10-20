const TONES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  UNPAID: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  CONFIRMED: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  PROCESSING: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  OUT_FOR_DELIVERY: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  DELIVERED: "bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200",
  PAID: "bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200",
  CANCELLED: "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  FAILED: "bg-blush-100 text-blush-700 dark:bg-blush-700/30 dark:text-blush-200",
};

export function StatusBadge({ status, children }: { status: string; children: React.ReactNode }) {
  return <span className={`badge ${TONES[status] ?? TONES.CANCELLED}`}>{children}</span>;
}
