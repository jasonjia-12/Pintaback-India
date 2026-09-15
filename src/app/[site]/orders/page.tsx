import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getSite, formatMoney, parseJsonObject } from "@/lib/sites";
import StatusPill from "@/components/StatusPill";
import { readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MyOrders({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { site: slug } = await params;
  const sp = await searchParams;
  const site = await getSite(slug);
  const session = await readSession();
  if (!site) return null;
  if (!session) redirect(`/${site.id}/login?next=/${site.id}/orders`);
  if (session.role !== "buyer") redirect("/dashboard");
  if (session.siteId !== site.id) redirect(`/${session.siteId}/orders`);
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.buyerId, session.uid))
    .orderBy(desc(orders.createdAt))
    .limit(60);

  return (
    <div className="container-page py-10">
      {sp.placed === "1" && (
        <div className="mb-6 rounded-md border border-pine-300 bg-verified px-5 py-4 text-sm text-pine-900">
          <strong>Simulated order submitted ✓</strong> — the Local Channel Partner and China Operations have been
          notified. Your partner will contact you to confirm price, delivery and the offline local contract.
        </div>
      )}
      <div className="flex items-end justify-between">
        <div>
          <p className="label-sm text-ochre">Account</p>
          <h1 className="mt-2.5 text-[28px] leading-tight">My orders</h1>
        </div>
        <Link href={`/${site.id}/products`} className="text-sm font-semibold text-pine-900 hover:underline">
          Continue shopping
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-sm text-ink/55">
          You have not submitted any simulated orders yet.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((o) => {
            const snap = parseJsonObject(o.buyerSnapshotJson);
            return (
              <Link key={o.id} href={`/${site.id}/orders/${o.id}`} className="card block p-5 transition hover:border-pine-600">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="num text-sm font-semibold text-ink">{o.orderNo}</p>
                    <p className="mt-0.5 text-xs text-ink/50">
                      {new Date(o.createdAt).toLocaleString()} · {o.itemCount} units ·{" "}
                      {typeof snap.companyName === "string" ? snap.companyName : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="num font-serif text-lg font-semibold text-pine-900">{formatMoney(o.subtotalMinor, o.currency)}</span>
                    <StatusPill status={o.status} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
