import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getSite, formatMoney } from "@/lib/sites";
import { productImage, productSpecs } from "@/lib/catalogView";
import AddToCart from "@/components/AddToCart";
import QtyPicker from "@/components/QtyPicker";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ site: string; sku: string }>;
}) {
  const { site: slug, sku } = await params;
  const site = await getSite(slug);
  if (!site) notFound();
  const row = await db
    .select()
    .from(products)
    .where(and(eq(products.siteId, site.id), eq(products.sku, sku)))
    .limit(1);
  const p = row[0];
  if (!p || p.status !== "active") notFound();
  const img = productImage(p);
  const specs = productSpecs(p);
  const specEntries = Object.entries(specs);

  return (
    <div className="container-page py-10">
      <nav className="label-sm text-ink/40">
        <Link className="hover:text-pine-900" href={`/${site.id}`}>Home</Link> /{" "}
        <Link className="hover:text-pine-900" href={`/${site.id}/products?category=${encodeURIComponent(p.category)}`}>
          {p.category}
        </Link>{" "}
        / <span className="text-ink/70">{p.sku}</span>
      </nav>
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="card self-start overflow-hidden bg-basin">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={p.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center text-pine-500">{p.category}</div>
          )}
        </div>
        <div>
          <span className="label-sm inline-block rounded-sm border border-line bg-basin px-2.5 py-1 text-ink-variant">
            {p.category}
          </span>
          <h1 className="mt-3.5 text-[30px] leading-tight text-ink">{p.title}</h1>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="num font-serif text-4xl font-semibold text-pine-900">
              {formatMoney(p.priceMinor, site.currency)}
            </span>
            <span className="text-sm text-ink/55">per {p.unit}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-variant">{p.description}</p>

          <div className="mt-6 overflow-hidden rounded-lg border border-line bg-white">
            <div className="basin label-sm flex items-center justify-between border-b border-line px-4 py-2 text-ink/50">
              <span>Commercial terms</span>
              <Link href={`/${site.id}/payment`} className="text-pine-900 hover:underline">
                Payment terms →
              </Link>
            </div>
            <dl className="divide-y divide-line text-sm">
              <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                <dt className="text-ink/55">Minimum order</dt>
                <dd className="num font-semibold text-ink">{p.moq} {p.unit}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                <dt className="text-ink/55">Unit price</dt>
                <dd className="num font-semibold text-ink">
                  {formatMoney(p.priceMinor, site.currency)} / {p.unit}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                <dt className="text-ink/55">Settlement price</dt>
                <dd className="text-right font-semibold text-ink">DDP — Delivered Duty Paid</dd>
              </div>
              {p.cnyRefPrice != null && (
                <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                  <dt className="text-ink/55">China reference</dt>
                  <dd className="num font-semibold text-ink">≈ ¥{p.cnyRefPrice.toLocaleString()}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                <dt className="text-ink/55">Invoicing</dt>
                <dd className="text-right font-semibold text-ink">
                  {site.taxLabel} on your local contract
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                <dt className="text-ink/55">Payment</dt>
                <dd className="text-right font-semibold text-ink">
                  70% deposit · 30% balance on delivery
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <p className="label-sm mb-3 text-ink/50">Order quantity · {p.unit}</p>
            <QtyPicker site={site.id} sku={p.sku} moq={p.moq} unit={p.unit} />
          </div>

          <div className="mt-6 rounded-lg bg-pine-900 p-5 text-sm text-white/85">
            <p className="font-serif text-lg font-medium text-white">How your order is handled</p>
            <p className="mt-1.5 leading-relaxed text-white/75">
              Submit a simulated order — no online payment in phase 1. The Local Channel Partner and
              China Operations are notified instantly, then the partner contacts you to sign the
              offline local contract at the DDP settlement price, payable 70% on confirmation and
              30% on local delivery.
            </p>
          </div>
        </div>
      </div>

      {specEntries.length > 0 && (
        <div className="mt-14">
          <h2 className="text-2xl leading-tight">Specifications</h2>
          <div className="card mt-4 divide-y divide-line overflow-hidden">
            {specEntries.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[180px_1fr] gap-4 px-4 py-2.5 text-sm">
                <span className="label-sm text-ink/45">{k.replace(/_/g, " ")}</span>
                <span className="text-ink">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 rounded-lg border border-line bg-basin p-5 text-sm text-ink-variant">
        <span className="font-semibold text-ink">Sold by:</span> {site.sellerDisplayName} ({site.sellerAddress}) —
        Local Channel Partner. Order details are shared with China Operations for sourcing and documentation.
      </div>
    </div>
  );
}
