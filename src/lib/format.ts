export function formatKsh(amount: number) {
  return `Ksh ${amount.toLocaleString("en-KE")}`;
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });
}

export function formatDayLong(date: Date | string) {
  return new Date(date).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Nairobi" });
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseGallery(gallery: string): string[] {
  try {
    const parsed = JSON.parse(gallery);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

export function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
