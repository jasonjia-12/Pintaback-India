import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const session = await readSession();
  if (!session) return null;
  const scope = session.role === "partner" ? eq(orders.siteId, session.siteId ?? "") : undefined;
  const buyerScope = session.role === "partner" ? eq(users.siteId, session.siteId ?? "") : undefined;
  const [orderTotal, submitted, contracted, buyerTotal] = await Promise.all([
    db.select({ c: count() }).from(orders).where(scope ? and(scope) : undefined),
    db
      .select({ c: count() })
      .from(orders)
      .where(and(...(scope ? [scope, eq(orders.status, "submitted")] : [eq(orders.status, "submitted")]))),
    db
      .select({ c: count() })
      .from(orders)
      .where(and(...(scope ? [scope, eq(orders.status, "contracted")] : [eq(orders.status, "contracted")]))),
    db.select({ c: count() }).from(users).where(and(eq(users.role, "buyer"), ...(buyerScope ? [buyerScope] : []))),
  ]);
  const cards = [
    { label: "Registered buyers", value: buyerTotal[0]?.c ?? 0, href: "/dashboard/buyers" },
    { label: "Simulated orders", value: orderTotal[0]?.c ?? 0, href: "/dashboard/orders" },
    { label: "Awaiting follow-up", value: submitted[0]?.c ?? 0, href: "/dashboard/orders?status=submitted" },
    { label: "Contracts signed", value: contracted[0]?.c ?? 0, href: "/dashboard/orders?status=contracted" },
  ];
  return (
    <div>
      <h1 className="text-[28px] leading-tight">Overview</h1>
      <p className="mt-2 text-sm text-ink/55">
        {session.role === "partner"
          ? "You see data for your own country site only (no export)."
          : "China team view across both country sites."}
      </p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card p-5 transition hover:border-pine-600 hover:shadow-card">
            <p className="label-sm text-ink/45">{c.label}</p>
            <p className="num mt-2.5 font-serif text-3xl font-semibold text-pine-900">{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
