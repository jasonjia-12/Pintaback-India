import Link from "next/link";
import { and, asc, count, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BuyersPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; q?: string }>;
}) {
  const session = await readSession();
  if (!session || session.role === "buyer") return null;
  const sp = await searchParams;
  const partnerSite = session.role === "partner" ? session.siteId ?? "in" : null;
  const siteSlug = partnerSite ?? (sp.site === "in" ? "in" : null);

  const conds: SQL[] = [eq(users.role, "buyer")];
  if (siteSlug) conds.push(eq(users.siteId, siteSlug));
  if (sp.q) {
    const { like, or } = await import("drizzle-orm");
    const q = `%${sp.q.trim()}%`;
    const o = or(like(users.companyName, q), like(users.email, q), like(users.city, q));
    if (o) conds.push(o);
  }
  const rows = await db.select().from(users).where(and(...conds)).orderBy(asc(users.id)).limit(200);
  const orderCounts = new Map<number, number>();
  if (rows.length) {
    const scopedConds = siteSlug ? [eq(orders.siteId, siteSlug)] : [];
    const grouped = await db
      .select({ buyerId: orders.buyerId, c: count() })
      .from(orders)
      .where(scopedConds.length ? and(...scopedConds) : undefined)
      .groupBy(orders.buyerId);
    for (const g of grouped) orderCounts.set(g.buyerId, g.c);
  }
  const siteLabel: Record<string, string> = { in: "IN" };

  return (
    <div>
      <h1 className="text-2xl leading-tight">Buyers (CRM)</h1>
      <p className="mt-2 text-sm text-ink/55">Registered B-buyers, contact data and order history — retained on platform for follow-up and re-orders.</p>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
        {(session.role === "partner"
          ? [{ id: partnerSite ?? "in", label: (partnerSite ?? "in").toUpperCase() }]
          : [
              { id: "in", label: "IN · India" },
            ]
        ).map((s) => (
          <Link
            key={s.id}
            href={`/dashboard/buyers?site=${s.id}`}
            className={`rounded-full border px-3.5 py-1.5 font-semibold ${
              siteSlug === s.id ? "border-pine-900 bg-pine-900 text-white" : "border-line bg-white text-ink hover:border-pine-600"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>
      <div className="card mt-6 overflow-hidden">
        <div className="divide-y divide-line">
          {rows.length === 0 && <p className="p-10 text-center text-sm text-ink/55">No buyers registered yet.</p>}
          {rows.map((u) => (
            <Link key={u.id} href={`/dashboard/buyers/${u.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-basin">
              <div>
                <p className="text-sm font-bold">{u.companyName || u.displayName}</p>
                <p className="text-xs text-ink/55">
                  {u.contactName} · {u.email} · {u.city || "—"}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-ink/55">
                <span>{u.buyerType}</span>
                {u.siteId && <span className="rounded bg-pine-100 px-1.5 py-0.5 font-bold text-pine-800">{siteLabel[u.siteId]}</span>}
                <span className="font-semibold text-ink/70">{orderCounts.get(u.id) ?? 0} orders</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
