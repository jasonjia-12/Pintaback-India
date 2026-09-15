"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ProductRow } from "@/lib/catalogView";
import { productImage } from "@/lib/catalogView";
import { formatMoney } from "@/lib/format";
import { clearCart, getCart, setCartItemQty } from "@/lib/cart";

type CartClientProps = {
  siteId: string;
  currency: string;
  products: ProductRow[];
  isBuyer: boolean;
  loginHref: string;
  ordersHref: string;
};

export default function CartClient({ siteId, currency, products, isBuyer, loginHref, ordersHref }: CartClientProps) {
  const router = useRouter();
  const [, setVersion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shippingMethod, setShippingMethod] = useState<"sea" | "air">("sea");
  const items = getCart(siteId);
  const bySku = useMemo(() => new Map(products.map((p) => [p.sku, p])), [products]);

  const lines = items
    .map((i) => ({ item: i, product: bySku.get(i.sku) }))
    .filter((l): l is { item: { sku: string; qty: number }; product: ProductRow } => Boolean(l.product));
  const subtotal = lines.reduce((s, l) => s + l.product.priceMinor * l.item.qty, 0);
  const deposit = Math.round(subtotal * 0.7);
  const balance = subtotal - deposit;
  const touch = () => {
    setVersion((v) => v + 1);
    window.dispatchEvent(new Event("ptb-cart-changed"));
  };

  async function submitOrder() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site: siteId,
          shippingMethod,
          items: lines.map((l) => ({ sku: l.item.sku, qty: l.item.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Order could not be submitted.");
      clearCart(siteId);
      router.push(`/${siteId}/orders/${data.orderId}?placed=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
      setSubmitting(false);
    }
  }

  if (items.length === 0 || lines.length === 0) {
    return (
      <div className="card p-12 text-center">
        <h1 className="text-2xl leading-tight">Your cart is empty</h1>
        <p className="mt-2 text-sm text-ink/55">Browse the catalog and add wholesale products above their MOQ.</p>
        <Link
          href={`/${siteId}/products`}
          className="mt-6 inline-block rounded-md bg-pine-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-pine-700"
        >
          Browse the catalog
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="label-sm text-ochre">Your selection</p>
          <h1 className="mt-2.5 text-[28px] leading-tight">Cart</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            clearCart(siteId);
            touch();
          }}
          className="text-sm font-semibold text-ink/45 transition hover:text-error"
        >
          Clear cart
        </button>
      </div>

      <div className="card mt-6 divide-y divide-line overflow-hidden">
        {lines.map(({ item, product }) => {
          const img = productImage(product);
          const belowMoq = item.qty < product.moq;
          return (
            <div key={product.sku} className="flex flex-wrap items-center gap-4 p-4">
              {img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt="" className="h-16 w-20 rounded-sm border border-line object-cover" />
              )}
              <div className="min-w-40 flex-1">
                <Link href={`/${siteId}/products/${product.sku}`} className="text-sm font-semibold text-ink hover:text-pine-900">
                  {product.title}
                </Link>
                <p className="num text-xs text-ink/50">
                  {formatMoney(product.priceMinor, currency)} / {product.unit} · MOQ {product.moq}
                </p>
                {belowMoq && <p className="text-xs font-semibold text-error">Below MOQ — increase quantity.</p>}
              </div>
              <div className="flex items-center overflow-hidden rounded-md border border-line bg-white">
                <button
                  type="button"
                  className="px-3 py-2 text-ink transition hover:bg-basin"
                  onClick={() => {
                    setCartItemQty(siteId, product.sku, item.qty - 1);
                    touch();
                  }}
                >
                  −
                </button>
                <input
                  type="number"
                  value={item.qty}
                  min={product.moq}
                  onChange={(e) => {
                    setCartItemQty(siteId, product.sku, Math.max(1, Math.floor(Number(e.target.value) || 1)));
                    touch();
                  }}
                  className="num w-16 border-x border-line bg-transparent py-2 text-center text-sm font-semibold outline-none"
                />
                <button
                  type="button"
                  className="px-3 py-2 text-ink transition hover:bg-basin"
                  onClick={() => {
                    setCartItemQty(siteId, product.sku, item.qty + 1);
                    touch();
                  }}
                >
                  +
                </button>
              </div>
              <div className="num w-28 text-right font-serif text-lg font-semibold text-pine-900">
                {formatMoney(product.priceMinor * item.qty, currency)}
              </div>
              <button
                type="button"
                aria-label="remove"
                onClick={() => {
                  setCartItemQty(siteId, product.sku, 0);
                  touch();
                }}
                className="text-ink/35 transition hover:text-error"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col items-end gap-4">
        <div className="card w-full max-w-sm p-5">
          <div className="flex items-baseline justify-between gap-4">
            <span className="label-sm text-ink/50">Shipping method</span>
            <span className="text-xs font-semibold text-pine-900">Default: by sea</span>
          </div>
          <select
            value={shippingMethod}
            onChange={(event) => {
              const method = event.target.value as "sea" | "air";
              setShippingMethod(method);
              if (method === "air") window.dispatchEvent(new Event("ptb-open-support"));
            }}
            className="mt-3 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-pine-600"
          >
            <option value="sea">By sea — standard consolidation</option>
            <option value="air">By air — contact support first</option>
          </select>
          {shippingMethod === "air" ? (
            <p className="mt-3 rounded-md border border-ochre/30 bg-ochre-soft px-3 py-2 text-xs leading-relaxed text-ink/70">Air freight requires a separate quote. Please use the floating support button to sign in and contact the human + AI support team before submitting.</p>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-ink/50">Sea freight is the default route for consolidated wholesale shipments.</p>
          )}
        </div>
        <div className="card w-full max-w-sm p-5">
          <div className="num flex justify-between text-sm text-ink/55">
            <span>Line items</span>
            <span>{lines.length}</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
            <span className="label-sm text-ink/50">Subtotal</span>
            <span className="num font-serif text-xl font-semibold text-pine-900">{formatMoney(subtotal, currency)}</span>
          </div>
        </div>
        <div className="card w-full max-w-sm p-5 text-sm">
          <div className="flex items-baseline justify-between">
            <span className="label-sm text-ink/50">Payment terms</span>
            <Link href={`/${siteId}/payment`} className="text-xs font-semibold text-pine-900 hover:underline">
              Details →
            </Link>
          </div>
          <dl className="mt-3 space-y-2.5">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink/70">Deposit · 70% <span className="text-ink/45">on order confirmation</span></dt>
              <dd className="num font-semibold text-ink">{formatMoney(deposit, currency)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink/70">Balance · 30% <span className="text-ink/45">on local delivery</span></dt>
              <dd className="num font-semibold text-ink">{formatMoney(balance, currency)}</dd>
            </div>
          </dl>
          <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink/50">
            Prices are DDP (Delivered Duty Paid) settlement prices in {currency}. Import duties and taxes are settled by
            the Local Channel Partner.
          </p>
        </div>
        {error && (
          <p className="w-full max-w-sm rounded-md border border-error/30 bg-error-soft/50 px-4 py-2 text-sm text-error">{error}</p>
        )}
        {isBuyer ? (
          <button
            type="button"
            disabled={submitting || shippingMethod === "air"}
            onClick={submitOrder}
            className="rounded-md bg-accent px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60"
          >
            {submitting ? "Submitting…" : shippingMethod === "air" ? "Contact support before submitting" : "Submit simulated order"}
          </button>
        ) : (
          <div className="card w-full max-w-sm p-5 text-center text-sm">
            <p className="text-ink/70">Sign in with your business account to submit this order.</p>
            <Link
              href={loginHref}
              className="mt-3 block rounded-md bg-pine-600 px-4 py-2.5 font-semibold text-white transition hover:bg-pine-700"
            >
              Sign in to order
            </Link>
            <p className="mt-2 text-xs text-ink/50">
              New buyer? <Link className="text-pine-900 underline" href={`/${siteId}/register`}>Register your business</Link>
            </p>
          </div>
        )}
        <p className="max-w-md text-right text-xs leading-relaxed text-ink/45">
          Phase-1 simulated order: no online payment. After submission, the Local Channel Partner and China
          Operations are notified; the partner contacts you to sign the offline local-to-local contract and to confirm
          the 70% deposit / 30% balance schedule on the DDP settlement price.
        </p>
      </div>
    </div>
  );
}
