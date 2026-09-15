import Link from "next/link";
import { Site } from "@/lib/sites";

export default function SiteFooter({ site }: { site: Site }) {
  return (
    <footer className="mt-16 border-t border-pine-950 bg-pine-900 text-white/85">
      <div className="container-page grid gap-10 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10">
              <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-white/70">
                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-ochre-light" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </span>
            <span className="font-serif text-lg font-semibold tracking-tight text-white">
              Pintaback {site.countryCode}
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            Factory-direct products from our direct sourcing team in China, curated for{" "}
            {site.countryName} businesses. Prices in {site.currency}; wholesale MOQ; orders
            handled by an in-country channel partner.
          </p>
        </div>
        <div>
          <h3 className="label-sm text-white/60">Buyers</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-white/80">
            <li><Link className="hover:text-white" href={`/${site.id}/products`}>Browse catalog</Link></li>
            <li><Link className="hover:text-white" href={`/${site.id}/register`}>Register your business</Link></li>
            <li><Link className="hover:text-white" href={`/${site.id}/#how-it-works`}>How simulated ordering works</Link></li>
            <li><Link className="hover:text-white" href={`/${site.id}/payment`}>Payment terms (DDP · 70 / 30)</Link></li>
            <li><Link className="hover:text-white" href={`/${site.id}/cart`}>Your cart</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="label-sm text-white/60">Seller &amp; platform</h3>
          <p className="mt-4 text-sm text-white/80">
            Sold by <strong className="font-semibold text-white">{site.sellerDisplayName}</strong>
            <span className="block text-white/60">{site.sellerAddress}</span>
          </p>
          <p className="mt-3 text-xs leading-relaxed text-white/65">
            Platform, code, brand and data belong to the China operating company. Local sales are
            performed by the Local Channel Partner. Buyer and order data is retained on the
            platform for service and follow-up.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Pintaback · Phase-1 simulated ordering · Online payment comes in a later phase
      </div>
    </footer>
  );
}
