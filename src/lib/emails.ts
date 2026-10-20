import "server-only";
import type { Order, OrderItem } from "@prisma/client";
import { formatDate, formatKsh, statusLabel } from "./format";

// HTML email templates. Every user-supplied value goes through esc().

const site = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function esc(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#fbf8f3;font-family:Helvetica,Arial,sans-serif;color:#292524">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden" cellpadding="0" cellspacing="0">
<tr><td style="background:#20593b;color:#ffffff;padding:20px 28px;font-family:Georgia,serif;font-size:20px">🌿 Great Rift Harvests</td></tr>
<tr><td style="padding:28px">
<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 16px;color:#1c1917">${title}</h1>
${body}
</td></tr>
<tr><td style="padding:16px 28px;background:#f5efe4;font-size:12px;color:#78716c">Farm-fresh flowers from Kenya's Great Rift Valley · <a href="${site()}" style="color:#20593b">${site().replace(/^https?:\/\//, "")}</a></td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${href}" style="background:#20593b;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;display:inline-block">${label}</a></p>`;
}

type FullOrder = Order & { items: OrderItem[] };

function itemsTable(order: FullOrder) {
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${esc(i.name)} <span style="color:#78716c">· ${esc(i.variantLabel)} × ${i.quantity}</span></td><td align="right">${formatKsh(i.price * i.quantity)}</td></tr>`,
    )
    .join("");
  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:4px 0;${bold ? "font-weight:bold;font-size:16px" : "color:#57534e"}">${label}</td><td align="right" style="${bold ? "font-weight:bold;font-size:16px" : ""}">${value}</td></tr>`;
  return `<table role="presentation" width="100%" style="font-size:14px;border-top:1px solid #e7e5e4;border-bottom:1px solid #e7e5e4;margin:16px 0" cellpadding="0" cellspacing="0">${rows}</table>
<table role="presentation" width="100%" style="font-size:14px" cellpadding="0" cellspacing="0">
${line("Subtotal", formatKsh(order.subtotal))}
${order.discount > 0 ? line(`Discount${order.couponCode ? ` (${esc(order.couponCode)})` : ""}`, `−${formatKsh(order.discount)}`) : ""}
${line("Delivery", order.deliveryFee === 0 ? "Free" : formatKsh(order.deliveryFee))}
${line("Total", formatKsh(order.total), true)}
</table>`;
}

function itemsText(order: FullOrder) {
  return [
    ...order.items.map((i) => `- ${i.name} (${i.variantLabel}) x${i.quantity}: ${formatKsh(i.price * i.quantity)}`),
    `Total: ${formatKsh(order.total)}`,
  ].join("\n");
}

export function orderConfirmationEmail(order: FullOrder) {
  const link = `${site()}/order/${order.token}`;
  const first = esc(order.name.split(" ")[0]);
  const when = order.deliveryDate ? formatDate(order.deliveryDate) : "as soon as possible";
  const payment =
    order.paymentMethod === "CASH"
      ? "Cash on delivery"
      : `M-Pesa${order.mpesaReceipt ? ` · receipt ${esc(order.mpesaReceipt)}` : ""}`;
  return {
    subject: `Order ${order.orderNumber} confirmed 💐`,
    html: layout(
      `Thank you, ${first}!`,
      `<p style="font-size:15px;line-height:1.6">We've received your order <strong>${order.orderNumber}</strong> and our florists are getting it ready.</p>
<p style="font-size:14px;line-height:1.6;color:#57534e">Delivering to <strong>${esc(order.address)}, ${esc(order.city)}</strong> · ${when}<br/>Payment: ${payment}</p>
${order.giftMessage ? `<p style="background:#fdf3f4;border-radius:12px;padding:12px 16px;font-style:italic">💌 “${esc(order.giftMessage)}”</p>` : ""}
${itemsTable(order)}
${button(link, "Track your order")}`,
    ),
    text: `Thank you, ${order.name.split(" ")[0]}! Your order ${order.orderNumber} is confirmed.\nDelivering to ${order.address}, ${order.city} (${when}).\n\n${itemsText(order)}\n\nTrack it: ${link}`,
  };
}

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  PROCESSING: { title: "Your flowers are being arranged", body: "Our florists are hand-tying your order right now." },
  OUT_FOR_DELIVERY: { title: "Your flowers are on the way 🚚", body: "Your order has left our studio and will be with you soon. Please keep your phone nearby." },
  DELIVERED: { title: "Delivered — enjoy your flowers 🌸", body: "Trim the stems at an angle and change the water every two days to keep them fresh for longer. We'd love a review!" },
  CANCELLED: { title: "Your order has been cancelled", body: "If you've already paid, our team will contact you about a refund. Reply to this email with any questions." },
};

export function hasStatusEmail(status: string) {
  return status in STATUS_COPY;
}

export function orderStatusEmail(order: FullOrder) {
  const copy = STATUS_COPY[order.status];
  const link = `${site()}/order/${order.token}`;
  return {
    subject: `Order ${order.orderNumber}: ${statusLabel(order.status)}`,
    html: layout(copy.title, `<p style="font-size:15px;line-height:1.6">${copy.body}</p>${button(link, "View your order")}`),
    text: `${copy.title}\n${copy.body}\n\nOrder ${order.orderNumber}: ${link}`,
  };
}

export function adminNewOrderEmail(order: FullOrder) {
  const link = `${site()}/admin/orders/${order.id}`;
  return {
    subject: `New order ${order.orderNumber} · ${formatKsh(order.total)}`,
    html: layout(
      `New order ${order.orderNumber}`,
      `<p style="font-size:14px;line-height:1.6">${esc(order.name)} · +${esc(order.phone)} · ${esc(order.email)}<br/>
${esc(order.address)}, ${esc(order.city)} · ${order.deliveryDate ? formatDate(order.deliveryDate) : "ASAP"}<br/>
Payment: ${order.paymentMethod === "CASH" ? "Cash on delivery" : `M-Pesa (${statusLabel(order.paymentStatus)})`}</p>
${order.giftMessage ? `<p style="font-style:italic">💌 “${esc(order.giftMessage)}”</p>` : ""}
${order.notes ? `<p><strong>Notes:</strong> ${esc(order.notes)}</p>` : ""}
${itemsTable(order)}
${button(link, "Open in admin")}`,
    ),
    text: `New order ${order.orderNumber} from ${order.name} (+${order.phone}).\n${order.address}, ${order.city}\n\n${itemsText(order)}\n\n${link}`,
  };
}

export function adminContactEmail(m: { name: string; email: string; phone?: string | null; subject: string; message: string }) {
  return {
    subject: `New message: ${m.subject}`,
    html: layout(
      esc(m.subject),
      `<p style="font-size:14px;color:#57534e">From ${esc(m.name)} · ${esc(m.email)}${m.phone ? ` · ${esc(m.phone)}` : ""}</p>
<p style="font-size:15px;line-height:1.6;white-space:pre-wrap">${esc(m.message)}</p>
${button(`${site()}/admin/messages`, "Open messages")}`,
    ),
    text: `From ${m.name} <${m.email}>${m.phone ? ` ${m.phone}` : ""}\n\n${m.message}`,
    replyTo: m.email,
  };
}

export function passwordResetEmail(name: string, link: string) {
  return {
    subject: "Reset your Great Rift Harvests password",
    html: layout(
      "Reset your password",
      `<p style="font-size:15px;line-height:1.6">Hi ${esc(name.split(" ")[0])}, we received a request to reset your password. This link expires in 1 hour.</p>
${button(link, "Choose a new password")}
<p style="font-size:13px;color:#78716c">If you didn't ask for this, you can safely ignore this email.</p>`,
    ),
    text: `Hi ${name.split(" ")[0]},\n\nReset your password (link expires in 1 hour): ${link}\n\nIf you didn't ask for this, ignore this email.`,
  };
}
