import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reconcileMpesaPayment } from "@/lib/payments";

// Polled by the order page while an M-Pesa payment is pending. If Safaricom's callback is
// slow or lost, this also asks Safaricom directly (rate-limited inside reconcileMpesaPayment).
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await db.order.findUnique({ where: { token }, select: { id: true, paymentStatus: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.paymentStatus === "PENDING") await reconcileMpesaPayment(order.id);
  const fresh = await db.order.findUniqueOrThrow({ where: { id: order.id }, select: { status: true, paymentStatus: true } });
  return NextResponse.json(fresh, { headers: { "Cache-Control": "no-store" } });
}
