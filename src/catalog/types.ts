/** Raw catalog offer, before normalization. Produced by any source provider (CSV/seed now, 1688 later). */
export type RawOffer = {
  sku: string;
  category: string;
  titleEn: string;
  titleLocal?: string | null;
  description: string;
  unit: string;
  moq: number;
  /** Already expressed in the target site currency, minor units. */
  priceMinor: number;
  /** Reference China (1688/CNY) price, used for margin analytics only. */
  cnyRefPrice?: number | null;
  fxRate?: number | null;
  specs?: Record<string, unknown>;
  sourceOfferId?: string | null;
};

/**
 * Catalog provider contract.
 * The storefront only reads normalized rows from the `products` table, so adding the
 * official 1688 connector later = adding one provider here + one sync script; no UI change.
 */
export type CatalogProvider = {
  id: string; // csv | alibaba1688
  label: string;
  pull(siteId: string): Promise<RawOffer[]>;
};
