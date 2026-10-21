import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markMpesaFailed, markMpesaPaid } from "@/lib/payments";

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
  if (!order) return NextResponse.json({ ResultCode: 0, ResultDesc: "Ignored" });

  if (cb.ResultCode === 0) {
    const items = cb.CallbackMetadata?.Item ?? [];
    const receiptValue = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value;
    const receipt = receiptValue ? String(receiptValue) : null;
    const amount = Number(items.find((i) => i.Name === "Amount")?.Value ?? 0);
    if (amount < order.total) {
      console.warn(`M-Pesa amount mismatch for ${order.orderNumber}: got ${amount}, expected ${order.total}`);
      await markMpesaFailed(order.id);
    } else if (!(await markMpesaPaid(order.id, receipt)) && receipt && !order.mpesaReceipt) {
      // Already marked paid by a status check (which has no receipt number); record it now.
      await db.order.update({ where: { id: order.id }, data: { mpesaReceipt: receipt } });
    }
  } else {
    await markMpesaFailed(order.id);
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
