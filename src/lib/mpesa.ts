import "server-only";

// M-Pesa Daraja STK Push integration.
// When credentials are missing the store runs in simulation mode so checkout
// can be tested end to end without a Safaricom account.

// MPESA_API_URL overrides the Safaricom host (e.g. to point at a mock server in tests).
const BASE =
  process.env.MPESA_API_URL ||
  (process.env.MPESA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke");

export function mpesaConfigured() {
  return Boolean(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET && process.env.MPESA_PASSKEY);
}

// Converts 07XXXXXXXX / +2547XXXXXXXX / 2547XXXXXXXX to 2547XXXXXXXX.
export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

async function accessToken() {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`M-Pesa auth failed (${res.status})`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function timestamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function credentials() {
  const shortcode = process.env.MPESA_SHORTCODE || "174379";
  const ts = timestamp();
  const password = Buffer.from(`${shortcode}${process.env.MPESA_PASSKEY}${ts}`).toString("base64");
  return { shortcode, ts, password };
}

export async function stkPush(opts: { phone: string; amount: number; reference: string }) {
  const { shortcode, ts, password } = credentials();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const res = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.max(1, Math.round(opts.amount)),
      PartyA: opts.phone,
      PartyB: shortcode,
      PhoneNumber: opts.phone,
      CallBackURL: `${siteUrl}/api/mpesa/callback`,
      AccountReference: opts.reference.slice(0, 12),
      TransactionDesc: "Great Rift Harvests order",
    }),
    cache: "no-store",
  });
  const data = (await res.json()) as { CheckoutRequestID?: string; errorMessage?: string; ResponseCode?: string };
  if (!res.ok || data.ResponseCode !== "0" || !data.CheckoutRequestID) {
    throw new Error(data.errorMessage || "M-Pesa request failed");
  }
  return data.CheckoutRequestID;
}

export type StkStatus = { state: "PAID" | "FAILED" | "PENDING"; detail: string };

// Asks Safaricom what happened to an STK push, for when the callback never arrived.
// Result codes: 0 = paid; 1032 = cancelled by customer; 1037 = no response from phone;
// 1 = insufficient funds; 2001 = wrong PIN; "still processing" comes back as an error.
export async function stkQuery(checkoutRequestId: string): Promise<StkStatus> {
  const { shortcode, ts, password } = credentials();
  const res = await fetch(`${BASE}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ BusinessShortCode: shortcode, Password: password, Timestamp: ts, CheckoutRequestID: checkoutRequestId }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { ResultCode?: string | number; ResultDesc?: string; errorMessage?: string };
  if (data.ResultCode === undefined) {
    // Typically "The transaction is being processed" while the customer is still on the PIN prompt.
    return { state: "PENDING", detail: data.errorMessage || `HTTP ${res.status}` };
  }
  return String(data.ResultCode) === "0"
    ? { state: "PAID", detail: data.ResultDesc || "Paid" }
    : { state: "FAILED", detail: data.ResultDesc || `Result ${data.ResultCode}` };
}
