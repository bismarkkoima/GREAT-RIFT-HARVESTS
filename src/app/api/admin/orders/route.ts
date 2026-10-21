import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { deliveryDateToKey } from "@/lib/delivery";

// Spreadsheet-safe CSV cell: quotes, and neutralises formulas (=, +, -, @) that Excel would execute.
function cell(value: string | number | null | undefined) {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const status = new URL(req.url).searchParams.get("status") || undefined;
  const orders = await db.order.findMany({ where: status ? { status } : {}, include: { items: true }, orderBy: { createdAt: "desc" } });
  const header = ["order_number", "placed_at", "status", "payment_method", "payment_status", "mpesa_receipt", "customer", "email", "phone", "address", "city", "delivery_date", "delivery_time", "items", "subtotal", "discount", "coupon", "delivery_fee", "total", "subscription"];
  const rows = orders.map((o) =>
    [
      o.orderNumber,
      o.createdAt.toISOString(),
      o.status,
      o.paymentMethod,
      o.paymentStatus,
      o.mpesaReceipt,
      o.name,
      o.email,
      `+${o.phone}`,
      o.address,
      o.city,
      o.deliveryDate ? deliveryDateToKey(o.deliveryDate) : "",
      o.deliverySlotLabel,
      o.items.map((i) => `${i.quantity} x ${i.name} (${i.variantLabel})`).join("; "),
      o.subtotal,
      o.discount,
      o.couponCode,
      o.deliveryFee,
      o.total,
      o.subscriptionId ? "yes" : "",
    ].map(cell).join(","),
  );
  return new Response([header.join(","), ...rows].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
