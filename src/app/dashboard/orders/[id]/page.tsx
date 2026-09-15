import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderEmails, orderItems, orders } from "@/db/schema";
import { readSession } from "@/lib/session";
import { getSite, formatMoney, parseJsonObject } from "@/lib/sites";
import { orderStatusLabel } from "@/lib/orderStatus";
import StatusPill from "@/components/StatusPill";
import OrderActions from "@/components/OrderActions";

export const dynamic = "force-dynamic";

export default async function OrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await readSession();
  if (!session || session.role === "buyer") return null;
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();
  const row = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = row[0];
  if (!order) notFound();
  if (session.role === "partner" && order.siteId !== session.siteId) notFound();
  const site = await getSite(order.siteId);
  const [items, emails] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(orderEmails).where(eq(orderEmails.orderId, order.id)),
  ]);
  const snap = parseJsonObject(order.buyerSnapshotJson);
  const canEdit = session.role === "partner" || session.role === "china_ops" || session.role === "admin";

  return (
    <div>
      <Link href="/dashboard/orders" className="text-sm font-semibold text-pine-900 hover:underline">← Orders</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="num font-serif text-2xl font-semibold">{order.orderNo}</p>
          <p className="text-xs text-ink/55">
            {site?.countryName} · {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <StatusPill status={order.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="card">
            <div className="border-b border-line px-5 py-3 label-sm text-ink/50">Items</div>
            <div className="divide-y divide-line">
              {items.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <div>
                    <p className="font-semibold">{i.title}</p>
                    <p className="text-xs text-ink/55">{i.sku} · {formatMoney(i.unitPriceMinor, order.currency)} / {i.unit} · MOQ {i.moqAtOrder}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">× {i.qty}</p>
                    <p className="text-xs font-semibold">{formatMoney(i.lineMinor, order.currency)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-line px-5 py-3">
              <span className="text-sm font-bold">Subtotal ({order.itemCount} units)</span>
              <span className="num font-serif text-lg font-semibold text-pine-900">{formatMoney(order.subtotalMinor, order.currency)}</span>
            </div>
          </div>

          {canEdit && (
            <div className="card p-5">
              <h2 className="label-sm text-ink/50">Update follow-up status</h2>
              <p className="mt-1 text-xs text-ink/55">submitted → being followed up → contract signed (offline) | cancelled</p>
              <div className="mt-3">
                <OrderActions orderId={order.id} status={order.status} />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="label-sm text-ink/50">Buyer</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Company", snap.companyName],
                ["Contact", snap.contactName],
                ["Email", snap.email],
                ["Phone", snap.phone],
                ["City", snap.city],
                ["Address", snap.address],
                [site?.taxLabel ?? "Tax", snap[site?.taxLabel ?? "taxId"] ?? snap.taxId],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-3">
                  <dt className="shrink-0 text-ink/55">{String(k)}</dt>
                  <dd className="text-right font-medium">{String(v ?? "—")}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="card p-5">
            <h2 className="label-sm text-ink/50">Email / notification log</h2>
            <div className="mt-3 space-y-2.5">
              {emails.length === 0 && <p className="text-xs text-ink/50">No records.</p>}
              {emails.map((e) => (
                <div key={e.id} className="text-xs">
                  <p className="font-semibold">
                    {e.mode.toUpperCase()}
                    {e.provider ? ` · ${e.provider}` : ""}
                  </p>
                  <p className="text-ink/55">{e.recipientLabel}</p>
                  <p className="mt-0.5 text-ink/60">{e.resultText}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
