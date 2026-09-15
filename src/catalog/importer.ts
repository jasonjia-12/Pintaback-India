import fs from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { RawOffer } from "./types";

const PALETTE = ["#167389", "#0f5a6b", "#0b7a75", "#1f7a5c", "#205fbf", "#7a4fd0"];

function hashInt(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function svgFor(siteId: string, offer: RawOffer): string {
  const color = PALETTE[hashInt(offer.sku) % PALETTE.length];
  const short = offer.titleEn.length > 34 ? offer.titleEn.slice(0, 31) + "..." : offer.titleEn;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0.55"/>
  </linearGradient></defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <rect x="24" y="24" width="752" height="552" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>
  <text x="40" y="88" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="700">PINTABACK · ${siteId.toUpperCase()}</text>
  <text x="40" y="300" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="40" font-weight="600">${short}</text>
  <text x="40" y="360" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="26" opacity="0.9">${offer.category} · MOQ ${offer.moq} ${offer.unit}</text>
  <text x="40" y="540" fill="#ffffff" font-family="monospace" font-size="22" opacity="0.8">SKU ${offer.sku}</text>
</svg>`;
}

/** Deterministic product image path per SKU, stored under public/images/products. */
export function ensureProductImage(siteId: string, offer: RawOffer): string {
  return `/images/products/${offer.sku}.jpg`;
}

export async function upsertRawOffers(
  siteId: string,
  currency: string,
  offers: RawOffer[],
  source: string,
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;
  const now = Date.now();
  for (const offer of offers) {
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.siteId, siteId), eq(products.sku, offer.sku)))
      .limit(1);
    const image = ensureProductImage(siteId, offer);
    const values = {
      title: offer.titleEn,
      titleLocal: offer.titleLocal ?? null,
      category: offer.category,
      description: offer.description,
      unit: offer.unit,
      moq: offer.moq,
      priceMinor: offer.priceMinor,
      currency,
      cnyRefPrice: offer.cnyRefPrice ?? null,
      fxRate: offer.fxRate ?? null,
      specsJson: JSON.stringify(offer.specs ?? {}),
      imagesJson: JSON.stringify([image]),
      source,
      sourceOfferId: offer.sourceOfferId ?? null,
      status: "active",
    };
    if (existing.length) {
      await db.update(products).set({ ...values, updatedAt: now }).where(eq(products.id, existing[0].id));
      updated++;
    } else {
      await db.insert(products).values({ siteId, sku: offer.sku, createdAt: now, updatedAt: now, ...values });
      inserted++;
    }
  }
  return { inserted, updated };
}
