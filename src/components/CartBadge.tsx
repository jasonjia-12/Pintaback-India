"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartCount } from "@/lib/cart";

export default function CartBadge({ site, href }: { site: string; href: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(cartCount(site));
    update();
    window.addEventListener("ptb-cart-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("ptb-cart-changed", update);
      window.removeEventListener("storage", update);
    };
  }, [site]);
  return (
    <Link
      href={href}
      className="relative inline-flex items-center gap-2 rounded-md border border-line bg-cream px-3 py-2 text-sm font-semibold text-ink transition hover:border-pine-600 hover:text-pine-900"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-pine-900">
        <path d="M6 7h12l1.2 12.2a1.6 1.6 0 0 1-1.6 1.8H6.4a1.6 1.6 0 0 1-1.6-1.8L6 7Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </svg>
      <span className="hidden sm:inline">Cart</span>
      {count > 0 && (
        <span className="num absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-pine-900 px-1 text-[11px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
