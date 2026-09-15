import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { readSession } from "@/lib/session";
import { getSite, formatMoney, parseJsonObject } from "@/lib/sites";
import { orderStatusLabel } from "@/lib/orderStatus";
import StatusPill from "@/components/StatusPill";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; status?: string; q?: string }>;
}) {
  const session = await readSession();
  if (!session || session.role === "buyer") return null;
  const sp = await searchParams;
  const partnerSite = session.role === "partner" ? session.siteId ?? "in" : null;
  const siteSlug = partnerSite ?? (sp.site === "in" ? "in" : null);

  const conds = [];
  if (siteSlug) conds.push(eq(orders.siteId, siteSlug));
  if (sp.status) conds.push(eq(orders.status, sp.status));
  if (sp.q) {
    const like = await import("drizzle-orm");
    conds.push(like.like(orders.orderNo, `%${sp.q.trim()}%`));
  }
  const rows = await db
    .select()
    .from(orders)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(100);

  const siteNames = new Map<string, string>();
  for (const s of ["in"]) siteNames.set(s, s.toUpperCase());
  const sites = session.role === "partner" ? [{ id: partnerSite, label: (partnerSite ?? "in").toUpperCase() }] : [
    { id: "in", label: "IN · India" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl leading-tight">Orders</h1>
          <p className="mt-2 text-sm text-ink/55">Simulated orders from registered buyers (no export available).</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
        {sites.map((s) => (
          <Link
            key={s.id}
            href={`/dashboard/orders?site=${s.id}${sp.status ? `&status=${sp.status}` : ""}`}
            className={`rounded-full border px-3.5 py-1.5 font-semibold ${
              siteSlug === s.id ? "border-pine-900 bg-pine-900 text-white" : "border-line bg-white text-ink hover:border-pine-600"
            }`}
          >
            {s.label}
          </Link>
        ))}
        {(["submitted", "following_up", "contracted", "cancelled"] as const).map((st) => (
          <Link
            key={st}
            href={`/dashboard/orders?site=${siteSlug ?? ""}${sp.status === st ? "" : `&status=${st}`}`}
            className={`rounded-full border px-3.5 py-1.5 ${
              sp.status === st ? "border-ink bg-ink text-white" : "border-line bg-white text-ink/70 hover:border-pine-600"
            }`}
          >
            {st.replace("_", " ")}
          </Link>
        ))}
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className="divide-y divide-line">
          {rows.length === 0 && <p className="p-10 text-center text-sm text-ink/55">No orders match the current filter.</p>}
          {rows.map((o) => {
            const snap = parseJsonObject(o.buyerSnapshotJson);
            return (
              <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-basin">
                <div>
                  <p className="num text-sm font-semibold">{o.orderNo}</p>
                  <p className="text-xs text-ink/55">
                    {String(snap.companyName ?? "—")} · {String(snap.contactName ?? "")} · {new Date(o.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="hidden text-xs text-ink/45 sm:block">{siteNames.get(o.siteId)}</span>
                  <span className="num font-semibold text-pine-900">{formatMoney(o.subtotalMinor, o.currency)}</span>
                  <StatusPill status={o.status} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
