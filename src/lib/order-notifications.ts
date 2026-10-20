import "server-only";
import { db } from "./db";
import { adminRecipients, sendEmail, sendSms } from "./notify";
import { adminNewOrderEmail, hasStatusEmail, orderConfirmationEmail, orderStatusEmail } from "./emails";
import { formatKsh } from "./format";

const site = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Sent once an order is confirmed: cash orders straight away, M-Pesa orders when payment lands.
export async function notifyOrderConfirmed(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;
  const admins = await adminRecipients();
  const adminMsg = adminNewOrderEmail(order);
  await Promise.all([
    sendEmail({ to: order.email, ...orderConfirmationEmail(order) }),
    sendSms(
      order.phone,
      `Great Rift Harvests: Order ${order.orderNumber} confirmed (${formatKsh(order.total)}). Track it at ${site()}/order/${order.token}`,
    ),
    ...admins.map((to) => sendEmail({ to, ...adminMsg })),
  ]);
}

export async function notifyOrderStatus(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || !hasStatusEmail(order.status)) return;
  const tasks: Promise<void>[] = [sendEmail({ to: order.email, ...orderStatusEmail(order) })];
  if (order.status === "OUT_FOR_DELIVERY") {
    tasks.push(sendSms(order.phone, `Great Rift Harvests: Your flowers (order ${order.orderNumber}) are on the way! 🌸`));
  }
  await Promise.all(tasks);
}
