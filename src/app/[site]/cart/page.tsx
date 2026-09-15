import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getSite } from "@/lib/sites";
import { readSession } from "@/lib/session";
import CartClient from "@/components/CartClient";

export const dynamic = "force-dynamic";

export default async function CartPage({ params }: { params: Promise<{ site: string }> }) {
  const { site: slug } = await params;
  const site = await getSite(slug);
  const session = await readSession();
  if (!site) return null;
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.siteId, site.id), eq(products.status, "active")));
  const isBuyer = session?.role === "buyer" && session.siteId === site.id;
  return (
    <div className="container-page py-8">
      <CartClient
        siteId={site.id}
        currency={site.currency}
        products={rows}
        isBuyer={isBuyer}
        loginHref={`/${site.id}/login?next=/${site.id}/cart`}
        ordersHref={`/${site.id}/orders`}
      />
    </div>
  );
}
