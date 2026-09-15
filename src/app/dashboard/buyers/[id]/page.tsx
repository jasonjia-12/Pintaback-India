import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { readSession } from "@/lib/session";
import { getSite, formatMoney, parseJsonObject } from "@/lib/sites";
import { orderStatusLabel } from "@/lib/orderStatus";

export const dynamic = "force-dynamic";

export default async function BuyerDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session || session.role === "buyer") return null;
  const { id } = await params;
  const buyerId = Number(id);
  if (!Number.isInteger(buyerId)) notFound();
  const row = await db.select().from(users).where(eq(users.id, buyerId)).limit(1);
  const buyer = row[0];
  if (!buyer || buyer.role !== "buyer") notFound();
  if (session.role === "partner" && buyer.siteId !== session.siteId) notFound();
  const site = buyer.siteId ? await getSite(buyer.siteId) : null;
  const ordersRows = await db
    .select()
    .from(orders)
    .where(eq(orders.buyerId, buyer.id))
    .orderBy(desc(orders.createdAt))
    .limit(100);
  const rows = [
    ["Company", buyer.companyName || buyer.displayName],
    ["Contact person", buyer.contactName],
    ["Email", buyer.email],
    ["Phone", buyer.phone],
    ["WhatsApp", buyer.whatsapp],
    ["City", buyer.city],
    ["Address", buyer.address],
    [site?.taxLabel ?? "Tax ID", buyer.taxId],
    ["Business type", buyer.buyerType],
    ["Registered", new Date(buyer.createdAt).toLocaleDateString()],
  ];
  return (
    <div>
      <Link href="/dashboard/buyers" className="text-sm font-semibold text-pine-900 hover:underline">← Buyers</Link>
      <h1 className="mt-2 text-2xl leading-tight">{buyer.companyName || buyer.displayName}</h1>
      <p className="text-sm text-ink/55">{buyer.email}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <div className="card h-fit p-5">
          <h2 className="label-sm text-ink/50">Profile (CRM)</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            {rows.map(([k, v]) => (
              <div key={String(k)} className="flex justify-between gap-3">
                <dt className="shrink-0 text-ink/55">{String(k)}</dt>
                <dd className="text-right font-medium">{String(v || "—")}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-ink/45">Marketing/outreach tooling arrives in phase 2; lists cannot be exported.</p>
        </div>
        <div className="card overflow-hidden">
          <div className="border-b border-line px-5 py-3 label-sm text-ink/50">
            Order history ({ordersRows.length})
          </div>
          {ordersRows.length === 0 && <p className="p-8 text-sm text-ink/55">No orders yet.</p>}
          <div className="divide-y divide-line">
            {ordersRows.map((o) => {
              const snap = parseJsonObject(o.buyerSnapshotJson);
              return (
                <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-basin">
                  <div>
                    <p className="num text-sm font-semibold">{o.orderNo}</p>
                    <p className="text-xs text-ink/55">{new Date(o.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="num font-semibold text-pine-900">{formatMoney(o.subtotalMinor, o.currency)}</p>
                    <p className="text-xs text-ink/55">{orderStatusLabel(o.status)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
