import { eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import { db } from "./index";
import { runMigrations } from "./migrate";
import { sites as sitesTable, users as usersTable } from "./schema";
import { CSV_PROVIDER } from "@/catalog/csv-provider";
import { upsertRawOffers } from "@/catalog/importer";

const SITES_SEED = [
  {
    id: "in",
    name: "Pintaback India",
    brandName: "Pintaback",
    tagline: "Factory-direct Chinese sourcing for Indian businesses",
    countryCode: "IN",
    countryName: "India",
    currency: "INR",
    orderPrefix: "SO-IN",
    sellerDisplayName: "Pintaback India Trading Co. — Local Channel Partner (demo)",
    sellerAddress: "Mumbai, India",
    taxLabel: "GSTIN",
    notifyEmails: JSON.stringify(["in.channel.partner@example.com", "china.ops@example.com"]),
    supportContact: "WhatsApp +91 98 0000 0000 (demo)",
  },
];

async function ensureSites() {
  const now = Date.now();
  for (const s of SITES_SEED) {
    const existing = await db.select().from(sitesTable).where(eq(sitesTable.id, s.id)).limit(1);
    if (existing.length) {
      await db.update(sitesTable).set({ ...s, updatedAt: now }).where(eq(sitesTable.id, s.id));
    } else {
      await db.insert(sitesTable).values({ ...s, locales: '["en"]', localePrimary: "en", status: "active", nextOrderSeq: 1, createdAt: now, updatedAt: now });
    }
  }
}

const DEMO_USERS = [
  { key: "buyer-in", siteId: "in", role: "buyer", email: "buyer.in@example.com", password: "Demo123!", displayName: "Mumbai Bazaar Imports", companyName: "Mumbai Bazaar Imports", contactName: "Rohan Mehta", city: "Mumbai", buyerType: "Wholesaler" },
  { key: "partner-in", siteId: "in", role: "partner", email: "partner.in@example.com", password: "Partner123!", displayName: "IN Channel Partner (demo)" },
  { key: "china", siteId: null, role: "china_ops", email: "ops@example.com", password: "Ops123!", displayName: "China Operations (demo)" },
  { key: "admin", siteId: null, role: "admin", email: "admin@example.com", password: "Admin123!", displayName: "Platform Administrator (demo)" },
] as const;

async function ensureUsers() {
  const now = Date.now();
  for (const u of DEMO_USERS) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, u.email)).limit(1);
    if (existing.length) continue;
    await db.insert(usersTable).values({
      siteId: u.siteId,
      role: u.role,
      email: u.email,
      passwordHash: hashSync(u.password, 10),
      displayName: u.displayName,
      companyName: "companyName" in u ? (u as { companyName?: string }).companyName ?? "" : "",
      contactName: "contactName" in u ? (u as { contactName?: string }).contactName ?? "" : "",
      city: "city" in u ? (u as { city?: string }).city ?? "" : "",
      buyerType: "buyerType" in u ? (u as { buyerType?: string }).buyerType ?? "" : "",
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function ensureCatalog() {
  const siteRows = await db.select().from(sitesTable);
  for (const site of siteRows) {
    const offers = await CSV_PROVIDER.pull(site.id);
    const res = await upsertRawOffers(site.id, site.currency, offers, "seed");
    console.log(`catalog ${site.id}: ${res.inserted} inserted, ${res.updated} updated`);
  }
}

async function main() {
  runMigrations();
  await ensureSites();
  await ensureUsers();
  await ensureCatalog();
  console.log("Setup complete. Demo logins (dev only — replace before production):");
  console.log("  Buyer IN    buyer.in@example.com    / Demo123!");
  console.log("  Partner IN  partner.in@example.com  / Partner123!");
  console.log("  China ops   ops@example.com         / Ops123!");
  console.log("  Admin       admin@example.com       / Admin123!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
