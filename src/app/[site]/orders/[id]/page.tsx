import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderEmails, orderItems, orders } from "@/db/schema";
import { getSite, formatMoney, parseJsonObject } from "@/lib/sites";
import { readSession } from "@/lib/session";
import { orderStatusLabel } from "@/lib/orderStatus";
import StatusPill from "@/components/StatusPill";

export const dynamic = "force-dynamic";

export default async function MyOrderPage({
  params,
}: {
  params: Promise<{ site: string; id: string }>;
}) {
  const { site: slug, id } = await params;
  const site = await getSite(slug);
  const session = await readSession();
  if (!site || !session) redirect(`/${slug}/login`);
  if (session.role !== "buyer" || session.siteId !== site.id) redirect("/dashboard");
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();
  const orderRow = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  const order = orderRow[0];
  if (!order || order.buyerId !== session.uid || order.siteId !== site.id) notFound();
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(desc(orderItems.id));
  const emails = await db.select().from(orderEmails).where(eq(orderEmails.orderId, order.id)).orderBy(desc(orderEmails.id));
  const snap = parseJsonObject(order.buyerSnapshotJson);
  const orderNote = parseJsonObject(order.note);
  const shippingMethod = orderNote.shippingMethod === "air" ? "By air — support quote required" : "By sea — standard consolidation";

  return (
    <div className="container-page py-10">
      <nav className="label-sm text-ink/40">
        <Link className="hover:text-pine-900" href={`/${site.id}/orders`}>My orders</Link> / {order.orderNo}
      </nav>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
        <div>
          <p className="num font-serif text-2xl font-semibold">{order.orderNo}</p>
          <p className="mt-1 text-xs text-ink/50">
            {new Date(order.createdAt).toLocaleString()} · simulated order · no online payment in phase 1
          </p>
        </div>
        <StatusPill status={order.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="label-sm text-ink/50">Items</h2>
          <div className="card mt-2 divide-y divide-line overflow-hidden">
            {items.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{i.title}</p>
                  <p className="num text-xs text-ink/50">
                    {i.sku} · {formatMoney(i.unitPriceMinor, order.currency)} / {i.unit} · MOQ {i.moqAtOrder}
                  </p>
                </div>
                <div className="text-right">
                  <p className="num font-semibold">× {i.qty}</p>
                  <p className="num text-xs font-semibold text-pine-900">{formatMoney(i.lineMinor, order.currency)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="label-sm text-ink/50">Buyer &amp; delivery</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Company", snap.companyName],
                ["Contact", snap.contactName],
                ["Phone", snap.phone],
                ["City", snap.city],
                ["Address", snap.address],
                [site.taxLabel, snap[site.taxLabel] ?? snap.taxId],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-4">
                  <dt className="text-ink/50">{String(k)}</dt>
                  <dd className="text-right font-medium">{String(v ?? "—")}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 border-t border-line pt-3 text-sm">
              <span className="text-ink/50">Shipping method</span>
              <p className="mt-1 font-semibold text-pine-900">{shippingMethod}</p>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="num text-ink/55">Subtotal ({order.itemCount} units)</span>
              <span className="num font-serif text-lg font-semibold text-pine-900">{formatMoney(order.subtotalMinor, order.currency)}</span>
            </div>
          </div>
          <div className="card p-5 text-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="label-sm text-ink/50">Payment terms · DDP</h2>
              <Link href={`/${site.id}/payment`} className="text-xs font-semibold text-pine-900 hover:underline">
                Details →
              </Link>
            </div>
            <dl className="mt-3 space-y-2.5">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink/70">
                  Deposit · 70% <span className="text-ink/45">on order confirmation</span>
                </dt>
                <dd className="num font-semibold">{formatMoney(Math.round(order.subtotalMinor * 0.7), order.currency)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink/70">
                  Balance · 30% <span className="text-ink/45">on local delivery</span>
                </dt>
                <dd className="num font-semibold">
                  {formatMoney(order.subtotalMinor - Math.round(order.subtotalMinor * 0.7), order.currency)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink/50">
              Settlement price is DDP (Delivered Duty Paid); import duties and taxes are settled by the Local Channel
              Partner.
            </p>
          </div>
          <div className="rounded-lg bg-pine-900 p-5 text-sm text-white/85">
            <p className="font-serif text-lg font-medium text-white">Next step</p>
            <p className="mt-1.5 text-white/75">
              The Local Channel Partner will contact you on {String(snap.phone ?? snap.whatsapp ?? "—")} to confirm the order and
              sign the offline local-to-local contract.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="label-sm text-ink/50">Order status</h2>
        <div className="card mt-2 p-5 text-sm text-ink/75">
          <p>
            Status: <strong>{orderStatusLabel(order.status)}</strong>
          </p>
          {order.status === "submitted" && <p className="mt-1 text-xs text-ink/50">Waiting for the channel partner to start follow-up.</p>}
          {order.status === "contracted" && (
            <p className="mt-1 text-xs text-ink/50">The offline local-to-local contract was signed between your business and the Local Channel Partner.</p>
          )}
          {order.status === "cancelled" && <p className="mt-1 text-xs text-ink/50">This order was cancelled before contract signature.</p>}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="label-sm text-ink/50">Notifications &amp; email log</h2>
        <div className="mt-2 space-y-2">
          {emails.map((e) => (
            <div key={e.id} className="card p-4 text-xs">
              <p className="font-semibold text-ink">
                Email {e.mode} · {e.recipientLabel}
              </p>
              <p className="mt-1 text-ink/55">{e.resultText}</p>
            </div>
          ))}
          {emails.length === 0 && <p className="text-xs text-ink/50">No notification records yet.</p>}
        </div>
      </div>
    </div>
  );
}
