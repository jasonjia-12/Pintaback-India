"use client";

import { useState } from "react";
import { addToCart } from "@/lib/cart";

export default function QtyPicker({
  site,
  sku,
  moq,
  unit,
}: {
  site: string;
  sku: string;
  moq: number;
  unit: string;
}) {
  const [qty, setQty] = useState(moq);
  const [added, setAdded] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center overflow-hidden rounded-md border border-line bg-white">
        <button
          type="button"
          aria-label="decrease"
          onClick={() => setQty((q) => Math.max(moq, q - 1))}
          className="px-3.5 py-2.5 text-ink transition hover:bg-basin"
        >
          −
        </button>
        <input
          type="number"
          min={moq}
          value={qty}
          onChange={(e) => setQty(Math.max(moq, Math.floor(Number(e.target.value) || moq)))}
          className="num w-20 border-x border-line bg-transparent py-2.5 text-center text-sm font-semibold outline-none"
        />
        <button
          type="button"
          aria-label="increase"
          onClick={() => setQty((q) => q + 1)}
          className="px-3.5 py-2.5 text-ink transition hover:bg-basin"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          addToCart(site, sku, qty);
          setAdded(true);
          window.setTimeout(() => setAdded(false), 1600);
        }}
        className={`rounded-md px-6 py-2.5 text-sm font-semibold text-white transition ${
          added ? "bg-pine-700" : "bg-pine-600 hover:bg-pine-700"
        }`}
      >
        {added ? `Added ${qty} ${unit}` : `Add ${qty} ${unit} to cart`}
      </button>
    </div>
  );
}
