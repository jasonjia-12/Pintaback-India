import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { Site, getSite } from "@/lib/sites";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function Home({ params }: { params: Promise<{ site: string }> }) {
  const { site: slug } = await params;
  const site = getSite(slug);
  const [s, rows] = await Promise.all([site, listProducts(slug)]);
  if (!s) return null; // layout notFound handles invalid slugs
  const categories = categoriesOf(rows);
  const featured = rows.slice(0, 8);

  return (
    <>
      <Hero site={s} skuCount={rows.length} categoryCount={categories.length} />
      <CategoriesStrip siteId={s.id} categories={categories} />
      <HowItWorks site={s} />
      <Featured site={s} products={featured} />
      <RegisterCta site={s} />
    </>
  );
}

async function listProducts(siteId: string) {
  return db
    .select()
    .from(products)
    .where(and(eq(products.siteId, siteId), eq(products.status, "active")))
    .orderBy(asc(products.category), asc(products.sku));
}

function categoriesOf(rows: { category: string }[]) {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}

function Hero({ site, skuCount, categoryCount }: { site: Site; skuCount: number; categoryCount: number }) {
  const stats = [
    { v: `${skuCount}`, t: "Verified SKUs", s: "Direct factory supply" },
    { v: `${categoryCount}`, t: "Wholesale categories", s: "Home, kitchen & tools" },
    { v: "70 / 30", t: "Deposit & balance", s: "70% advance · 30% on delivery" },
    { v: site.taxLabel, t: "Tax ID on file", s: `Invoiced in ${site.currency}` },
  ];
  const lane = [
    { k: "Origin", v: "Direct sourcing from China" },
    { k: "Consolidation", v: "LCL & FCL sea freight" },
    { k: "Settlement price", v: "DDP — Delivered Duty Paid" },
    { k: "Duties & taxes", v: "Settled by the local partner" },
    { k: "Payment terms", v: "70% deposit · 30% balance" },
    { k: "Local seller", v: site.sellerDisplayName },
  ];
  return (
    <section className="border-b border-line bg-paper pb-12 pt-10">
      <div className="container-page grid items-start gap-8 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <div className="label-sm inline-flex items-center gap-2 rounded-sm bg-pine-900 px-3 py-1.5 text-white">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-ochre-light" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M5 21V9l5-4 5 4v12M15 21V12h4v9" />
            </svg>
            <span>Yiwu, Guangzhou &amp; Shenzhen factory belts · sourced for {site.countryName}</span>
          </div>
          <h1 className="text-[32px] leading-[1.12] font-normal text-ink sm:text-[44px] lg:text-[52px]">
            Factory-direct wholesale from China, invoiced in {site.currency} and delivered by your
            local partner.
          </h1>
          <p className="max-w-3xl text-[15px] leading-relaxed text-ink-variant">
            Every listing is the result of our direct sourcing from China and is sold to you by{" "}
            {site.sellerDisplayName} in {site.countryName}. Add products above MOQ, submit a
            simulated order, and your channel partner confirms the price, the paperwork and the
            local contract with your business.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={`/${site.id}/products`}
              className="rounded-md bg-pine-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pine-700"
            >
              Browse the catalog
            </Link>
            <Link
              href={`/${site.id}/register`}
              className="rounded-md border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-pine-600 hover:text-pine-900"
            >
              Register your business
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.t} className="rounded-md border border-line bg-white p-3.5">
                <div className="num font-serif text-2xl font-semibold text-ink">{s.v}</div>
                <div className="mt-0.5 text-xs font-semibold text-ink">{s.t}</div>
                <div className="text-[11px] text-ink/50">{s.s}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden space-y-4 lg:col-span-4 lg:block">
          <div className="relative overflow-hidden rounded-lg border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero/hero-china-sourcing.jpg"
            alt="Direct sourcing from China — B2B factory sourcing"
            className="h-56 w-full object-cover"
          />
          </div>
          <div className="rounded-lg border border-line bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-pine-600" />
                <span className="label-sm text-ink">China → {site.countryName} inbound lane</span>
              </span>
              <span className="rounded-sm border border-line bg-basin px-2 py-0.5 text-[11px] font-semibold text-ink-variant">
                Phase 1
              </span>
            </div>
            <dl className="mt-3 divide-y divide-line text-sm">
              {lane.map((r) => (
                <div key={r.k} className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink/45">{r.k}</dt>
                  <dd className="text-right text-[13px] font-semibold text-ink">{r.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoriesStrip({ siteId, categories }: { siteId: string; categories: { name: string; count: number }[] }) {
  const categoryImages: Record<string, string> = {
    "Home & Kitchen": "/images/categories/home-kitchen.jpg",
    "Tools & Hardware": "/images/categories/tools-hardware.jpg",
  };
  return (
    <section className="border-b border-line bg-basin py-8">
      <div className="container-page">
        <div className="flex items-center justify-between">
          <span className="label-sm text-ink/50">Explore categories</span>
          <Link href={`/${siteId}/products`} className="text-sm font-semibold text-pine-900 underline-offset-4 hover:underline">
            View all products →
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => {
            const img = categoryImages[c.name] ?? "/images/categories/home-kitchen.jpg";
            return (
              <Link
                key={c.name}
                href={`/${siteId}/products?category=${encodeURIComponent(c.name)}`}
                className="group relative flex overflow-hidden rounded-lg border border-line bg-white transition hover:shadow-card"
              >
                <div className="h-20 w-24 shrink-0 overflow-hidden bg-basin">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={c.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                </div>
                <div className="flex flex-col justify-center border-l border-line p-3.5">
                  <span className="text-sm font-semibold text-ink group-hover:text-pine-900">{c.name}</span>
                  <span className="num mt-0.5 text-[11px] text-ink/55">{c.count} wholesale products</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorks({ site }: { site: Site }) {
  const steps = [
    {
      n: "01",
      t: "Register your business",
      d: `Company name, contact, WhatsApp, city and ${site.taxLabel} (optional). Your profile powers your future re-orders and price follow-ups.`,
      img: "/images/steps/step-1-register.jpg",
    },
    {
      n: "02",
      t: "Build your cart",
      d: `Add products above their MOQ. Everything is quoted in ${site.currency}; MOQ and unit are shown on every card.`,
      img: "/images/steps/step-2-cart.jpg",
    },
    {
      n: "03",
      t: "Submit a simulated order",
      d: "No online payment yet. On submit, the order is stored on the platform and immediately visible to the Local Channel Partner and China Operations (email + in-app).",
      img: "/images/steps/step-3-order.jpg",
    },
    {
      n: "04",
      t: "Partner confirms & signs locally",
      d: "Your channel partner contacts you, confirms the DDP settlement price and the 70% deposit / 30% balance schedule, and signs the offline local-to-local contract. Online payment arrives in a later phase.",
      img: "/images/steps/step-4-contract.jpg",
    },
  ];
  return (
    <section id="how-it-works" className="border-b border-line bg-paper py-16">
      <div className="container-page">
        <p className="label-sm text-ochre">Simulated ordering · phase 1</p>
        <h2 className="mt-2.5 text-[28px] leading-tight text-ink sm:text-[32px]">How ordering works</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="card group relative flex flex-col overflow-hidden p-0 transition hover:shadow-card">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-basin">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.img} alt={s.t} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                <span className="num absolute left-3 top-3 rounded-sm bg-pine-900 px-2.5 py-1 font-serif text-sm font-semibold text-white">
                  {s.n}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-[15px] font-semibold text-ink">{s.t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-variant">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Featured({ site, products }: { site: Site; products: Awaited<ReturnType<typeof listProducts>> }) {
  return (
    <section className="bg-paper py-16">
      <div className="container-page">
        <div className="flex items-end justify-between">
          <div>
            <p className="label-sm text-ochre">Direct sourcing from China to your counter</p>
            <h2 className="mt-2.5 text-[28px] leading-tight text-ink sm:text-[32px]">
              Trending with {site.countryName} buyers
            </h2>
          </div>
          <Link href={`/${site.id}/products`} className="hidden text-sm font-semibold text-pine-900 underline-offset-4 hover:underline sm:block">
            View all →
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} siteId={site.id} siteCurrency={site.currency} p={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RegisterCta({ site }: { site: Site }) {
  return (
    <section className="container-page py-16">
      <div className="flex flex-col items-start justify-between gap-5 rounded-lg border border-line bg-basin p-8 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl leading-tight text-ink">Ready to order at factory-direct prices?</h2>
          <p className="mt-2 text-sm text-ink-variant">
            Register once — then submit simulated orders and let your local channel partner handle the rest.
          </p>
        </div>
        <Link
          href={`/${site.id}/register`}
          className="shrink-0 rounded-md bg-pine-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-pine-700"
        >
          Register your business
        </Link>
      </div>
    </section>
  );
}
