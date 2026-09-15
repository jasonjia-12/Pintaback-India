import Link from "next/link";
import { notFound } from "next/navigation";
import { getSite } from "@/lib/sites";

export const dynamic = "force-dynamic";

export default async function PaymentTermsPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: slug } = await params;
  const site = await getSite(slug);
  if (!site) notFound();

  const schedule = [
    {
      n: "01",
      share: "70%",
      t: "Deposit · advance payment",
      due: "Due on order confirmation",
      d: `Paid once your order is confirmed under the local contract, before our China sourcing team books production and freight with the factories. The deposit locks your unit price and your shipping slot.`,
    },
    {
      n: "02",
      share: "30%",
      t: "Balance · final payment",
      due: "Due on local delivery",
      d: `Paid at handover of the goods in ${site.countryName}, against the delivery documents. Nothing is collected before the shipment reaches you — the balance follows the delivery, not the order date.`,
    },
  ];

  const ddpPoints = [
    `Every price on this site — unit prices, the cart subtotal and the local contract — is a DDP settlement price quoted in ${site.currency}.`,
    "DDP (Delivered Duty Paid) covers the goods, international freight, export and import clearance, import duties and applicable taxes up to the agreed delivery point.",
    `Import duties, taxes and clearance are settled by ${site.sellerDisplayName} as the seller on your local contract. As the buyer you do not run customs clearance and you are not billed again for clearance, duties or taxes.`,
    `Your ${site.taxLabel} is recorded on the local contract, so the invoicing and tax paperwork match your business.`,
  ];

  const atAGlance = [
    ["Settlement price", "DDP — Delivered Duty Paid"],
    ["Deposit (advance payment)", "70% on order confirmation"],
    ["Balance (final payment)", "30% on local delivery"],
    ["Currency", site.currency],
    ["Duties & taxes", "Settled by the local partner"],
    ["Contract", "Offline local-to-local"],
  ];

  return (
    <div className="container-page py-10">
      <p className="label-sm text-ochre">Payment terms</p>
      <h1 className="mt-2.5 text-[30px] leading-tight text-ink sm:text-[36px]">
        How you pay: 70% deposit, 30% balance
      </h1>
      <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink-variant">
        Orders are settled offline under the local contract between your business and{" "}
        {site.sellerDisplayName}. The standard split is <strong className="font-semibold text-ink">70% advance payment</strong>{" "}
        on order confirmation and <strong className="font-semibold text-ink">30% balance</strong> on local delivery, applied to
        the DDP settlement price.
      </p>

      <div className="mt-9 grid gap-5 md:grid-cols-2">
        {schedule.map((s) => (
          <div key={s.n} className="card p-6">
            <div className="flex items-baseline justify-between">
              <span className="num font-serif text-4xl font-semibold text-pine-900">{s.share}</span>
              <span className="num label-sm text-ink/35">{s.n}</span>
            </div>
            <h2 className="mt-4 text-[15px] font-semibold text-ink">{s.t}</h2>
            <p className="label-sm mt-1 text-ochre">{s.due}</p>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-variant">{s.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-serif text-xl font-medium text-ink">Settlement price is DDP</h2>
          <p className="label-sm mt-1 text-ochre">Incoterms · Delivered Duty Paid</p>
          <ul className="mt-5 space-y-3.5 text-sm leading-relaxed text-ink-variant">
            {ddpPoints.map((line) => (
              <li key={line} className="flex gap-2.5">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-pine-600" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-pine-900 p-6 text-sm text-white/85">
          <h2 className="font-serif text-xl font-medium text-white">
            Duties and taxes are carried by the local partner
          </h2>
          <p className="mt-2.5 leading-relaxed text-white/75">
            {site.sellerDisplayName} is the seller on your local contract and the importer of record for the shipment
            into {site.countryName}. Customs clearance, import duties and applicable taxes are handled and settled by
            the local partner — nothing beyond the DDP price is passed on to your business.
          </p>
          <dl className="mt-6 divide-y divide-white/15 text-[13px]">
            {atAGlance.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 py-2">
                <dt className="text-white/55">{k}</dt>
                <dd className="text-right font-semibold text-white">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="label-sm text-ink/50">How the two payments are raised</h2>
        <div className="card mt-2 divide-y divide-line overflow-hidden text-sm">
          <div className="px-5 py-4">
            <p className="font-semibold text-ink">1 · Deposit invoice — 70%</p>
            <p className="mt-1 text-ink-variant">
              Issued by the Local Channel Partner once your order is confirmed, against the local contract and your{" "}
              {site.taxLabel}.
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="font-semibold text-ink">2 · Balance invoice — 30%</p>
            <p className="mt-1 text-ink-variant">
              Issued on local delivery, as soon as the goods are handed over with the delivery documents.
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="font-semibold text-ink">No other charges at settlement</p>
            <p className="mt-1 text-ink-variant">
              Freight, export and import clearance, duties and taxes are already inside the DDP price — 70% + 30% is the
              full amount you settle.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-line bg-basin p-5 text-sm text-ink-variant">
        <span className="font-semibold text-ink">Phase 1 note:</span> no online payment is collected on this platform yet.
        Orders are submitted as simulated orders and the 70 / 30 schedule is confirmed and executed offline, under the
        local-to-local contract signed with the Local Channel Partner.
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/${site.id}/products`}
          className="rounded-md bg-pine-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pine-700"
        >
          Browse the catalog
        </Link>
        <Link
          href={`/${site.id}/#how-it-works`}
          className="rounded-md border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-pine-600 hover:text-pine-900"
        >
          How ordering works
        </Link>
      </div>
    </div>
  );
}
