import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const session = await readSession();
  if (!session || session.role === "buyer") return null;
  const sp = await searchParams;
  const partnerSite = session.role === "partner" ? session.siteId ?? "in" : null;
  const siteSlug = partnerSite ?? (sp.site === "in" ? "in" : null);
  const conds = [];
  if (siteSlug) conds.push(eq(notifications.siteId, siteSlug));
  const rows = await db
    .select()
    .from(notifications)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl leading-tight">Notifications</h1>
      <p className="mt-2 text-sm text-ink/55">Order notifications visible to the Local Channel Partner and China Operations.</p>
      <div className="card mt-6 divide-y divide-line overflow-hidden">
        {rows.length === 0 && <p className="p-10 text-center text-sm text-ink/55">Nothing yet.</p>}
        {rows.map((n) => (
          <div key={n.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5">
            <div>
              <p className="text-sm font-bold">{n.subject}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink/65">{n.body}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-ink/50">
              <span className="rounded bg-pine-100 px-1.5 py-0.5 font-bold text-pine-800">{n.siteId.toUpperCase()}</span>
              <span>{new Date(n.createdAt).toLocaleString()}</span>
              {n.orderId && (
                <Link href={`/dashboard/orders/${n.orderId}`} className="font-semibold text-pine-900 hover:underline">
                  View order
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
