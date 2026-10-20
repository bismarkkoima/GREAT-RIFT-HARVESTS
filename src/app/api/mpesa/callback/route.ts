import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { notifyOrderConfirmed } from "@/lib/order-notifications";

type CallbackItem = { Name: string; Value?: string | number };
type Callback = {
  Body?: {
    stkCallback?: {
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: { Item: CallbackItem[] };
    };
  };
};

// Safaricom posts the STK Push result here.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Callback;
  const cb = body.Body?.stkCallback;
  if (!cb?.CheckoutRequestID) return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid payload" }, { status: 400 });

  const order = await db.order.findUnique({ where: { mpesaCheckoutId: cb.CheckoutRequestID } });
  // Safaricom may retry callbacks; only act on orders still awaiting payment.
  if (!order || order.paymentStatus === "PAID") return NextResponse.json({ ResultCode: 0, ResultDesc: "Ignored" });

  if (cb.ResultCode === 0) {
    const items = cb.CallbackMetadata?.Item ?? [];
    const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value;
    const amount = Number(items.find((i) => i.Name === "Amount")?.Value ?? 0);
    if (amount < order.total) {
      console.warn(`M-Pesa amount mismatch for ${order.orderNumber}: got ${amount}, expected ${order.total}`);
      await db.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
    } else {
      await db.order.update({
        where: { id: order.id },
        data: { paymentStatus: "PAID", status: order.status === "PENDING" ? "CONFIRMED" : order.status, mpesaReceipt: receipt ? String(receipt) : null },
      });
      after(() => notifyOrderConfirmed(order.id));
    }
  } else {
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
