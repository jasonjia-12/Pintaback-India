import Link from "next/link";
import { and, asc, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getSite } from "@/lib/sites";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>;
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { site: slug } = await params;
  const sp = await searchParams;
  const site = await getSite(slug);
  if (!site) return null;

  const where = [eq(products.siteId, site.id), eq(products.status, "active")];
  if (sp.category) where.push(eq(products.category, sp.category));
  if (sp.q?.trim()) where.push(like(products.title, `%${sp.q.trim()}%`));
  const rows = await db
    .select()
    .from(products)
    .where(and(...where))
    .orderBy(asc(products.category), asc(products.sku));
  const categories = await db
    .selectDistinct({ category: products.category })
    .from(products)
    .where(and(eq(products.siteId, site.id), eq(products.status, "active")));

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-sm text-ochre">Wholesale catalog</p>
          <h1 className="mt-2.5 text-[28px] leading-tight sm:text-[32px]">
            {sp.category ?? (sp.q ? `Results for “${sp.q}”` : "All products")}
          </h1>
        </div>
        <p className="num text-sm text-ink/55">
          {rows.length} product{rows.length === 1 ? "" : "s"} · priced in {site.currency}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          href={`/${site.id}/products`}
          className={`rounded-md border px-3.5 py-1.5 text-sm font-semibold transition ${
            !sp.category
              ? "border-pine-900 bg-pine-900 text-white"
              : "border-line bg-white text-ink hover:border-pine-600"
          }`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.category}
            href={`/${site.id}/products?category=${encodeURIComponent(c.category)}`}
            className={`rounded-md border px-3.5 py-1.5 text-sm font-semibold transition ${
              sp.category === c.category
                ? "border-pine-900 bg-pine-900 text-white"
                : "border-line bg-white text-ink hover:border-pine-600"
            }`}
          >
            {c.category}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="card mt-8 p-10 text-center text-sm text-ink/55">
          No products match yet. Try another category or <Link className="text-pine-900 underline" href={`/${site.id}/products`}>clear filters</Link>.
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((p) => (
            <ProductCard key={p.id} siteId={site.id} siteCurrency={site.currency} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
