"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function SupportWidget({ siteId }: { siteId: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openSupport = () => setOpen(true);
    window.addEventListener("ptb-open-support", openSupport);
    return () => window.removeEventListener("ptb-open-support", openSupport);
  }, []);

  return (
    <>
      <button type="button" aria-label="Contact support" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-pine-900 text-white shadow-lg ring-4 ring-white/80 transition hover:-translate-y-0.5 hover:bg-pine-700">
        <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v6A2.5 2.5 0 0 1 16.5 14H12l-4.5 4v-4h0A2.5 2.5 0 0 1 5 11.5v-6Z" />
          <path d="M8.5 8.5h7M8.5 11h4" />
        </svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-pine-950/25 p-5 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="support-title">
          <div className="w-full max-w-sm rounded-xl border border-line bg-cream p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="label-sm text-ochre">Pintaback support</p><h2 id="support-title" className="mt-2 text-xl font-semibold text-ink">Need help with shipping?</h2></div>
              <button type="button" aria-label="Close support dialog" onClick={() => setOpen(false)} className="text-2xl leading-none text-ink/45 hover:text-ink">×</button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink/65">Please sign in to your business account first. After signing in, our human support team and AI assistant will work together to answer your question and confirm the best shipping option.</p>
            <div className="mt-5 flex gap-3">
              <Link href={`/${siteId}/login?next=/${siteId}/cart`} className="flex-1 rounded-md bg-pine-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-pine-700">Sign in to contact support</Link>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink/70 hover:bg-basin">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
