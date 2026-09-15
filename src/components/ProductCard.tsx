import Link from "next/link";
import { ProductRow } from "@/lib/catalogView";
import { formatMoney } from "@/lib/sites";
import { productImage } from "@/lib/catalogView";
import AddToCart from "./AddToCart";

export default function ProductCard({ siteId, siteCurrency, p }: { siteId: string; siteCurrency: string; p: ProductRow }) {
  const img = productImage(p);
  return (
    <div className="card group flex flex-col overflow-hidden transition hover:shadow-card">
      <Link href={`/${siteId}/products/${p.sku}`} className="relative block aspect-[4/5] overflow-hidden bg-basin">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={p.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-pine-500">{p.category}</div>
        )}
        <span className="label-sm absolute left-2 top-2 rounded-sm border border-line bg-paper/95 px-1.5 py-0.5 text-ink">
          MOQ {p.moq} {p.unit}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-3.5">
        <div className="label-sm text-ink/45">{p.category}</div>
        <Link href={`/${siteId}/products/${p.sku}`} className="mt-1.5 line-clamp-2 min-h-[2.6em] text-sm font-semibold leading-snug text-ink hover:text-pine-900">
          {p.title}
        </Link>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="num font-serif text-xl font-semibold text-pine-900">
            {formatMoney(p.priceMinor, siteCurrency)}
          </span>
          <span className="text-[11px] text-ink/50">per {p.unit}</span>
        </div>
        <div className="mt-auto pt-3">
          <AddToCart site={siteId} sku={p.sku} moq={p.moq} unit={p.unit} />
        </div>
      </div>
      <div className="label-sm border-t border-line px-3.5 py-2 text-ink/45">
        Direct from China · DDP settlement
      </div>
    </div>
  );
}
