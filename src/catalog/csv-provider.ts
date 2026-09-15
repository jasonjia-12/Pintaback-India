import fs from "node:fs";
import { CatalogProvider, RawOffer } from "./types";

/** Minimal RFC4180-ish CSV parser: handles quotes, commas and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      if (!inQuotes && cur.length === 0) inQuotes = true;
      else if (!inQuotes) cur += ch; // literal quote inside an unquoted field
      else inQuotes = false; // closing quote at end of quoted field
    }
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else cur += ch;
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ""));
}

export const CSV_PROVIDER: CatalogProvider = {
  id: "csv",
  label: "Local CSV/seed catalog importer",
  async pull(siteId) {
    const file = process.env.SEED_CATALOG_FILE ?? "data/seed/products.csv";
    const text = fs.readFileSync(file, "utf8");
    const rows = parseCsv(text);
    if (!rows.length) return [];
    const header = rows[0].map((h) => h.trim());
    const offers: RawOffer[] = [];
    for (const r of rows.slice(1)) {
      const rec = Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])) as Record<string, string>;
      if (rec.site !== siteId) continue;
      if (!rec.sku || !rec.price_minor) continue;
      offers.push({
        sku: rec.sku.trim(),
        category: rec.category.trim(),
        titleEn: rec.title_en.trim(),
        titleLocal: rec.title_local?.trim() || null,
        description: rec.description?.trim() ?? "",
        unit: rec.unit.trim() || "pcs",
        moq: parseInt(rec.moq || "1", 10) || 1,
        priceMinor: parseInt(rec.price_minor, 10),
        cnyRefPrice: rec.cny_ref_price ? parseFloat(rec.cny_ref_price) : null,
        fxRate: rec.fx_rate ? parseFloat(rec.fx_rate) : null,
        specs: parseSpecs(rec.specs_json),
        sourceOfferId: rec.source_offer_id?.trim() || null,
      });
    }
    return offers;
  },
};

function parseSpecs(s: string | undefined): Record<string, unknown> {
  const t = (s ?? "").trim();
  if (!t) return {};
  if (t.startsWith("{")) {
    try {
      return JSON.parse(t);
    } catch {
      return {};
    }
  }
  const out: Record<string, unknown> = {};
  for (const pair of t.split("|")) {
    const i = pair.indexOf("=");
    if (i <= 0) continue;
    out[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  }
  return out;
}
