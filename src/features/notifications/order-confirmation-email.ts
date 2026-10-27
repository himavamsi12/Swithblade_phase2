import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/payload-types";

/*
 * The "order confirmed" email. Table layout and inline styles, because email
 * clients ignore most CSS.
 */

const BRAND = "#0238bb";
const MUTED = "#6b6b6b";
const STROKE = "#e5e5e5";
const FONT = "Helvetica, Arial, sans-serif";

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

const absolute = (path: string) => new URL(path, siteConfig.url).toString();

export function orderNumber(order: Pick<Order, "id" | "displayId">) {
  return `SB-${order.displayId ?? order.id}`;
}

export function orderConfirmationEmail(order: Order) {
  const currency = order.currency ?? "INR";
  const money = (amount: number) => formatPrice(amount, currency);
  const number = orderNumber(order);
  const items = order.lineItems ?? [];
  const address = order.shippingAddress;
  const name = address?.firstName?.trim() || null;
  const subtotal = order.totals?.subtotal ?? order.amount ?? 0;
  const discount = order.totals?.discountTotal ?? 0;
  const total = order.amount ?? subtotal - discount;
  const accountUrl = absolute(siteConfig.accountHref);

  const addressLines = address
    ? [
        [address.firstName, address.lastName].filter(Boolean).join(" "),
        address.addressLine1,
        address.addressLine2,
        [address.city, address.state, address.postalCode]
          .filter(Boolean)
          .join(", "),
        address.phone,
      ].filter((l): l is string => Boolean(l))
    : [];

  const subject = `Your ${siteConfig.name} order ${number} is confirmed`;

  const itemRows = items
    .map((item) => {
      const image = item.image
        ? `<img src="${escape(absolute(item.image))}" width="64" height="80" alt="" style="display:block;width:64px;height:80px;object-fit:cover;background:#f2f2f2;border:0" />`
        : "";
      return `<tr>
  <td width="64" style="padding:12px 16px 12px 0;vertical-align:top">${image}</td>
  <td style="padding:12px 0;vertical-align:top;font:14px/1.4 ${FONT};color:#000">
    <div style="text-transform:uppercase;font-weight:600">${escape(item.title)}</div>
    ${item.options ? `<div style="color:${MUTED};margin-top:4px">${escape(item.options)}</div>` : ""}
    <div style="color:${MUTED};margin-top:4px">Qty ${item.quantity}</div>
  </td>
  <td align="right" style="padding:12px 0;vertical-align:top;font:14px/1.4 ${FONT};color:#000;white-space:nowrap">${money(item.unitPrice * item.quantity)}</td>
</tr>`;
    })
    .join("");

  const summaryRow = (label: string, value: string, strong = false) =>
    `<tr>
  <td style="padding:4px 0;font:${strong ? "600 " : ""}14px/1.4 ${FONT};color:${strong ? "#000" : MUTED}">${label}</td>
  <td align="right" style="padding:4px 0;font:${strong ? "600 " : ""}14px/1.4 ${FONT};color:#000">${value}</td>
</tr>`;

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#f2f2f2">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff">
  <tr><td style="padding:32px 32px 0;font:600 20px/1.2 ${FONT};letter-spacing:2px;text-transform:uppercase;color:#000">${escape(siteConfig.name)}</td></tr>
  <tr><td style="padding:24px 32px 0;font:600 22px/1.3 ${FONT};color:#000">Thank you for your order${name ? `, ${escape(name)}` : ""}!</td></tr>
  <tr><td style="padding:8px 32px 0;font:14px/1.5 ${FONT};color:${MUTED}">Your payment was successful and we're getting order <strong style="color:#000">${number}</strong> ready. We'll let you know when it ships.</td></tr>
  <tr><td style="padding:24px 32px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${STROKE};border-bottom:1px solid ${STROKE}">${itemRows}</table>
  </td></tr>
  <tr><td style="padding:16px 32px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${summaryRow("Subtotal", money(subtotal))}
      ${discount > 0 ? summaryRow("Discount", `−${money(discount)}`) : ""}
      ${summaryRow("Shipping", "Free")}
      ${summaryRow("Total paid", money(total), true)}
    </table>
  </td></tr>
  ${
    addressLines.length
      ? `<tr><td style="padding:24px 32px 0;font:14px/1.5 ${FONT};color:#000">
    <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};margin-bottom:6px">Delivering to</div>
    ${addressLines.map(escape).join("<br />")}
  </td></tr>`
      : ""
  }
  <tr><td style="padding:28px 32px 32px">
    <a href="${escape(accountUrl)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font:500 14px/1 ${FONT};padding:14px 24px">View your order</a>
  </td></tr>
</table>
<p style="font:12px/1.5 ${FONT};color:${MUTED};margin:16px 0 0">Questions? Just reply to this email.</p>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `Thank you for your order${name ? `, ${name}` : ""}!`,
    "",
    `Order ${number} is confirmed. We'll let you know when it ships.`,
    "",
    ...items.map(
      (i) =>
        `${i.quantity} × ${i.title}${i.options ? ` (${i.options})` : ""}: ${money(i.unitPrice * i.quantity)}`,
    ),
    "",
    `Subtotal: ${money(subtotal)}`,
    ...(discount > 0 ? [`Discount: −${money(discount)}`] : []),
    "Shipping: Free",
    `Total paid: ${money(total)}`,
    ...(addressLines.length ? ["", "Delivering to:", ...addressLines] : []),
    "",
    `View your order: ${accountUrl}`,
  ].join("\n");

  return { subject, html, text };
}
