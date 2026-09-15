import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sites as sitesTable } from "@/db/schema";
import { parseJsonArray } from "./format";

export { formatMoney } from "./format";
export { parseJsonArray, parseJsonObject, currencyMeta } from "./format";

export type Site = typeof sitesTable.$inferSelect;

export const SITE_SLUGS = ["in"] as const;
export type SiteSlug = (typeof SITE_SLUGS)[number];

export function isSiteSlug(v: string): v is SiteSlug {
  return (SITE_SLUGS as readonly string[]).includes(v);
}

export function siteNotifyEmails(site: Site): string[] {
  const emails = parseJsonArray(site.notifyEmails);
  return emails.length ? emails : ["in-local-partner@example.com", "china-ops@example.com"];
}

export async function getSite(id: string): Promise<Site | null> {
  if (!isSiteSlug(id)) return null;
  const rows = await db.select().from(sitesTable).where(eq(sitesTable.id, id)).limit(1);
  return rows[0] ?? null;
}
