import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { Site, formatMoney } from "@/lib/sites";
import { readSession } from "@/lib/session";
import CartBadge from "./CartBadge";

export default async function SiteHeader({ site }: { site: Site }) {
  const session = await readSession();
  const showStore = session?.role === "buyer";
  const navLink = "hover:text-pine-900 hover:underline hover:underline-offset-4";
  const deskCity = site.sellerAddress.split(",")[0]?.trim() || site.countryName;
  const buyer =
    session?.role === "buyer"
      ? ((await db
          .select({ companyName: users.companyName, taxId: users.taxId })
          .from(users)
          .where(eq(users.id, session.uid))
          .limit(1))[0] ?? null)
      : null;
  const buyerName = buyer?.companyName || session?.name || "";
  const buyerInitials = buyerName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
  const taxLine = !showStore
    ? null
    : buyer?.taxId
      ? `${site.taxLabel} Verified`
      : `${site.taxLabel} not on file`;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-md">
      <div className="bg-pine-900 text-white">
        <div className="container-page flex items-center justify-between gap-4 py-1.5">
          <span className="label-sm flex min-w-0 flex-1 items-center gap-2 text-white/80">
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-ochre-light" />
            <span className="truncate">
              Direct China Node: Shenzhen–Guangzhou–{deskCity} Corridor Active
            </span>
          </span>
          <span className="label-sm hidden shrink-0 items-center gap-1.5 rounded-sm bg-ochre px-2 py-1 text-white md:flex">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5h16v11H8l-4 3V5Z" />
            </svg>
            <span>Support {site.supportContact}</span>
          </span>
          <span className="hidden min-w-0 flex-1 items-center justify-end gap-2 lg:flex">
            <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 text-ochre-light" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3Z" />
            </svg>
            <span className="label-sm truncate text-white/60">
              Zero Cross-Border FX Remittance Risk | {deskCity} Sourcing Desk Online
            </span>
          </span>
          <span className="hidden shrink-0 items-center rounded-full border border-white/20 p-0.5 sm:flex">
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-pine-900">
              {site.countryName} · {site.currency}
            </span>
          </span>
        </div>
      </div>
      <div className="container-page flex items-center justify-between gap-4 py-3.5">
        <Link href={`/${site.id}`} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine-900">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/80">
              <svg viewBox="0 0 24 24" className="h-3 w-3 text-ochre-light" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
          </span>
          <span className="leading-tight">
            <span className="flex items-center gap-1.5">
              <span className="font-serif text-[22px] font-semibold tracking-tight text-ink">
                Pintaback
              </span>
              <span className="rounded-sm border border-ochre/40 bg-ochre-soft px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-ochre">
                TRADE
              </span>
            </span>
            <span className="block text-[11px] text-ink-variant">
              {site.countryName} · {site.currency} · Local channel partner
            </span>
          </span>
        </Link>
        <nav className="label-sm hidden items-center gap-6 text-ink-variant lg:flex">
          <Link href={`/${site.id}`} className={navLink}>Home</Link>
          <Link href={`/${site.id}/products`} className={`${navLink} font-bold text-ink`}>Wholesale Categories</Link>
          <Link href={`/${site.id}/#how-it-works`} className={navLink}>How it works</Link>
          <Link href={`/${site.id}/payment`} className={navLink}>Payment terms</Link>
        </nav>
        <div className="flex items-center gap-2.5">
          <Link
            href={`/${site.id}/orders`}
            className="hidden items-center gap-2 rounded-md border border-line bg-cream px-3 py-2 text-sm font-semibold text-ink transition hover:border-pine-600 hover:text-pine-900 sm:inline-flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-pine-900">
              <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
              <path d="M9 8h6M9 12h6" />
            </svg>
            <span className="hidden lg:inline">Order</span>
          </Link>
          <CartBadge site={site.id} href={`/${site.id}/cart`} />
          {session ? (
            <Link
              href={showStore ? `/${site.id}/orders` : "/dashboard"}
              className="hidden items-center gap-2 rounded-md border border-line bg-cream px-2.5 py-1.5 transition hover:border-pine-600 sm:flex"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine-100 text-[11px] font-bold text-pine-900">
                {buyerInitials || "?"}
              </span>
              <span className="leading-tight">
                <span className="block max-w-[9rem] truncate text-sm font-semibold text-ink">
                  {buyerName}
                </span>
                {taxLine && (
                  <span className="flex items-center gap-1">
                    {buyer?.taxId && (
                      <svg viewBox="0 0 24 24" className="h-3 w-3 text-pine-600" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    <span className="label-sm text-ink-variant">{taxLine}</span>
                  </span>
                )}
              </span>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-ink-variant" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </Link>
          ) : (
            <>
              <Link
                href={`/${site.id}/login`}
                className="hidden rounded-md border border-line bg-cream px-3 py-2 text-sm font-semibold text-ink transition hover:border-pine-600 hover:text-pine-900 sm:block"
              >
                Sign in
              </Link>
              <Link
                href={`/${site.id}/register`}
                className="hidden rounded-md bg-pine-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-pine-700 sm:block"
              >
                Register business
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
