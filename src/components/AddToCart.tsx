"use client";

import { useState } from "react";
import { addToCart } from "@/lib/cart";

export default function AddToCart({
  site,
  sku,
  moq,
  unit,
  label = "Add to cart",
}: {
  site: string;
  sku: string;
  moq: number;
  unit: string;
  label?: string;
}) {
  const [added, setAdded] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        addToCart(site, sku, moq);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1600);
      }}
      className={
        added
          ? "w-full rounded-md bg-pine-600 px-4 py-2.5 text-sm font-semibold text-white"
          : "w-full rounded-md bg-pine-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pine-700"
      }
    >
      {added ? `Added — MOQ ${moq} ${unit}` : label}
    </button>
  );
}
