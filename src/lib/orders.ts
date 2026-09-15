import { and, eq, inArray } from "drizzle-orm";
import { db, sqlite } from "@/db";
import { orderEmails, orderItems, notifications, orders, products, users } from "@/db/schema";
import { Site, formatMoney } from "./sites";
import { deliverOrderEmail, EmailOrderSummary } from "./email";

export type OrderLineInput = { sku: string; qty: number };

export type BuyerCtx = {
  id: number;
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
  address: string;
  city: string;
  taxId: string;
};

import { canTransition, orderStatusLabel } from "./orderStatus";
export { canTransition, orderStatusLabel };

function numberOrThrow(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Unexpected rowid: ${String(v)}`);
  return n;
}

export async function createSimulatedOrder(site: Site, buyer: BuyerCtx, lines: OrderLineInput[], shippingMethod: "sea" | "air" = "sea") {
  if (!lines.length) throw new Error("Cart is empty");
  const skus = lines.map((l) => l.sku);
  const found = await db
    .select()
    .from(products)
    .where(and(eq(products.siteId, site.id), inArray(products.sku, skus), eq(products.status, "active")));
  const bySku = new Map(found.map((p) => [p.sku, p]));

  const errors: string[] = [];
  const itemRows = lines.map((l) => {
    const p = bySku.get(l.sku);
    if (!p) {
      errors.push(`SKU ${l.sku} is not available on this site.`);
      return null;
    }
    if (!Number.isInteger(l.qty) || l.qty < 1) {
      errors.push(`${p.title}: quantity must be a whole number of at least 1.`);
      return null;
    }
    if (l.qty < p.moq) {
      errors.push(`${p.title}: minimum order is ${p.moq} ${p.unit}.`);
      return null;
    }
    return {
      productId: p.id,
      sku: p.sku,
      title: p.title,
      unit: p.unit,
      qty: l.qty,
      unitPriceMinor: p.priceMinor,
      lineMinor: p.priceMinor * l.qty,
      moqAtOrder: p.moq,
      specsJson: p.specsJson,
    };
  });
  if (errors.length) throw new Error(errors.join(" "));

  const rows = itemRows as NonNullable<(typeof itemRows)[number]>[];
  const subtotal = rows.reduce((sum, r) => sum + r.lineMinor, 0);
  const now = Date.now();
  let orderId = 0;
  let orderNo = "";

  sqlite.transaction(() => {
    const seqRow = sqlite
      .prepare("SELECT next_order_seq FROM sites WHERE id = ?")
      .get(site.id) as { next_order_seq: number };
    const seq = seqRow.next_order_seq;
    sqlite.prepare("UPDATE sites SET next_order_seq = ?, updated_at = ? WHERE id = ?").run(seq + 1, now, site.id);
    orderNo = `${site.orderPrefix}-${String(seq).padStart(4, "0")}`;

    const buyerSnapshot = {
      companyName: buyer.companyName,
      contactName: buyer.contactName,
      phone: buyer.phone,
      email: buyer.email,
      address: buyer.address,
      city: buyer.city,
      taxId: buyer.taxId,
      [site.taxLabel]: buyer.taxId,
    };
    const res = db
      .insert(orders)
      .values({
        orderNo,
        siteId: site.id,
        buyerId: buyer.id,
        type: "simulated",
        status: "submitted",
        currency: site.currency,
        subtotalMinor: subtotal,
        itemCount: rows.reduce((s, r) => s + r.qty, 0),
        buyerSnapshotJson: JSON.stringify(buyerSnapshot),
        note: JSON.stringify({ shippingMethod }),
        createdAt: now,
        updatedAt: now,
      })
      .run();
    orderId = numberOrThrow(res.lastInsertRowid);
    for (const r of rows) {
      db.insert(orderItems)
        .values({ orderId, createdAt: now, ...r })
        .run();
    }
  })();

  const totalLabel = formatMoney(subtotal, site.currency);
  await db.insert(notifications).values({
    siteId: site.id,
    orderId,
    kind: "order_new",
    audience: "both",
    subject: `New simulated order ${orderNo}`,
    body: `${buyer.companyName} submitted ${rows.length} line item(s), ${rows.reduce((s, r) => s + r.qty, 0)} ${rows.length > 1 ? "units" : "unit"} in total — subtotal ${totalLabel}. Local Channel Partner follows up to sign the offline local contract.`,
    createdAt: now,
  });

  const summary: EmailOrderSummary = {
    orderNo,
    buyerCompany: buyer.companyName,
    buyerContact: buyer.contactName,
    buyerEmail: buyer.email,
    lines: rows.map((r) => ({ title: r.title, sku: r.sku, qty: r.qty, unit: r.unit, lineLabel: formatMoney(r.lineMinor, site.currency) })),
    totalMinor: subtotal,
    currency: site.currency,
    siteName: site.name,
    sellerDisplayName: site.sellerDisplayName,
  };
  const delivery = await deliverOrderEmail(site, summary);
  await db.insert(orderEmails).values({
    orderId,
    siteId: site.id,
    mode: delivery.mode,
    recipientLabel: delivery.recipientLabel,
    provider: delivery.provider,
    resultText: delivery.resultText,
    createdAt: Date.now(),
  });

  return { orderId, orderNo, subtotalMinor: subtotal };
}

export async function transitionOrderStatus(
  orderId: number,
  from: string,
  to: string,
): Promise<{ ok: boolean; error?: string; nextStatus?: string }> {
  const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) return { ok: false, error: "Order not found" };
  if (order.status !== from) return { ok: false, error: "Order status changed elsewhere — refresh and retry." };
  if (!canTransition(from, to)) return { ok: false, error: `Transition from ${from} to ${to} is not allowed.` };
  const now = Date.now();
  await db.update(orders).set({ status: to, updatedAt: now }).where(eq(orders.id, orderId));
  await db.insert(notifications).values({
    siteId: order.siteId,
    orderId,
    kind: "status_change",
    audience: "both",
    subject: `Order ${order.orderNo} → ${to.replace("_", " ")}`,
    body: `Status updated by ${to === "contracted" ? "Local Channel Partner (offline local-to-local contract signed)" : "team member"}.`,
    createdAt: now,
  });
  return { ok: true, nextStatus: to };
}
