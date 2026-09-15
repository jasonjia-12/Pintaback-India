import { db } from "@/db";
import { runMigrations } from "@/db/migrate";
import { sites as sitesTable } from "@/db/schema";
import { CSV_PROVIDER } from "./csv-provider";
import { upsertRawOffers } from "./importer";

const args = process.argv.slice(2);
function argValue(name: string, fb: string): string {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fb;
}

async function main() {
  runMigrations();
  const file = argValue("--file", "data/seed/products.csv");
  const source = argValue("--source", "csv");
  process.env.SEED_CATALOG_FILE = file;
  const siteRows = await db.select().from(sitesTable);
  const total = { inserted: 0, updated: 0 };
  for (const site of siteRows) {
    const offers = await CSV_PROVIDER.pull(site.id);
    const res = await upsertRawOffers(site.id, site.currency, offers, source);
    console.log(`${site.id}: ${res.inserted} inserted, ${res.updated} updated (source=${source}, file=${file})`);
    total.inserted += res.inserted;
    total.updated += res.updated;
  }
  console.log(`Total: ${total.inserted} inserted, ${total.updated} updated`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
