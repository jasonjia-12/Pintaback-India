# Pintaback

China-direct B2B sourcing storefront for Indian businesses.

Pintaback lets a verified Indian buyer browse a curated 1688-sourced catalog in
INR, build a cart that enforces per-SKU MOQ, and submit an order. Fulfilment is
deliberately **offline**: the online order is an intent capture that notifies the
local channel partner and China operations, who then follow up and close an
offline local contract. The platform is the front door and the system of record
for that handoff — not the payment rail.

> **Phase 1 prototype.** The order flow is `type: "simulated"` — no live payment or
> shipping integration. See [Known gaps](#known-gaps) before treating any of this
> as production behaviour.

> **TODO — placeholder artwork.** `public/images/steps/step-2-cart.jpg` is a
> temporary crop. The illustration it came from had `PRICE QUOTES (PKR)` and
> `Rs 785,950 PKR` rendered into its pixels, which cannot be changed by editing
> text. Swap in an INR version once India artwork exists.

---

## Business flow

```
Buyer (IN)                Platform                      Operations
──────────                ────────                      ──────────
browse catalog  ───────►  INR pricing, MOQ guard
add to cart     ───────►  server-side re-validation
submit order    ───────►  order_no SO-IN-0001          ──►  notification to
                          buyer snapshot frozen            partner + china ops
                          status: submitted          ◄──
                                                         partner follows up
                          status: following_up       ◄──
                                                         offline local contract
                          status: contracted
```

Key invariants the code enforces:

- **Prices are never trusted from the client.** Cart lines are re-resolved from the
  `products` table server-side at submit time.
- **MOQ is enforced at order time**, not just in the UI — a submitted quantity below
  the SKU's MOQ is rejected with a per-line error.
- **The buyer's details are snapshotted** into `orders.buyer_snapshot_json`, so a later
  profile edit cannot retroactively change a submitted order.
- **Order numbers are allocated inside a SQLite transaction** from `sites.next_order_seq`,
  so concurrent submits cannot collide.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React Server Components) |
| UI | React 19, Tailwind CSS 4 |
| Database | SQLite via `better-sqlite3`, WAL mode |
| ORM / migrations | Drizzle ORM + Drizzle Kit |
| Auth | `jose` HS256 JWT in an httpOnly cookie, `bcryptjs` password hashing |
| Validation | `zod` on every API route |
| Email | Resend (optional — falls back to in-app record) |
| Language | TypeScript, strict |

---

## Quick start

Requires **Node.js 20+** and a C toolchain (`better-sqlite3` is a native module).

```bash
npm install
cp .env.example .env.local     # then set SESSION_SECRET
npm run setup                  # create DB, run migrations, seed site + users + catalog
npm run dev                    # http://localhost:3000
```

`/` redirects to `/in`, the India storefront.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run setup` | Migrate + seed sites, demo users, and catalog (idempotent) |
| `npm run seed` | Alias of `setup` |
| `npm run import:csv` | Re-import `data/seed/products.csv` only |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

---

## Demo accounts

Created by `npm run setup`. **These are dev fixtures — delete or rotate them before
any real deployment.**

| Role | Email | Password | Lands on |
| --- | --- | --- | --- |
| Buyer | `buyer.in@example.com` | `Demo123!` | `/in` |
| Local channel partner | `partner.in@example.com` | `Partner123!` | `/dashboard` |
| China operations | `ops@example.com` | `Ops123!` | `/dashboard` |
| Administrator | `admin@example.com` | `Admin123!` | `/dashboard` |

---

## Roles

Defined in [`src/lib/roles.ts`](src/lib/roles.ts).

| Role | Scope | Can do |
| --- | --- | --- |
| `buyer` | one site | Browse, cart, submit orders, view own orders |
| `partner` | one site | Dashboard: triage site orders, advance status, view buyers |
| `china_ops` | global | Cross-site operations view |
| `admin` | global | Full access |

Buyers and partners carry a `siteId`; `china_ops` and `admin` are global (`siteId: null`).

---

## Order lifecycle

A deliberately small state machine — see [`src/lib/orderStatus.ts`](src/lib/orderStatus.ts).

```
submitted ──► following_up ──► contracted
    │              │
    └──────────────┴─────────► cancelled
```

`contracted` and `cancelled` are terminal. Transitions are validated server-side by
`canTransition()`, and every transition is guarded by an optimistic-concurrency check
(`order.status !== from` → "changed elsewhere, refresh and retry").

---

## Catalog pipeline

The storefront only ever reads normalized rows from the `products` table, so adding a
real supplier connector is additive — one provider plus one sync script, no UI change.

```
provider.pull(siteId) ──► RawOffer[] ──► upsertRawOffers() ──► products table
```

Providers implement [`CatalogProvider`](src/catalog/types.ts):

- **`csv`** — [`src/catalog/csv-provider.ts`](src/catalog/csv-provider.ts). Reads
  `data/seed/products.csv`. This is what phase 1 ships with.
- **`alibaba1688`** — [`src/catalog/alibaba1688-provider.ts`](src/catalog/alibaba1688-provider.ts).
  **Stub that throws.** The file documents the intended integration contract
  (Open Platform auth, endpoint scope, translation, FX snapshot + buffer,
  idempotent upsert keyed on `(site_id, source_offer_id)`).

`RawOffer` carries both the site-currency price (`priceMinor`) and an optional
`cnyRefPrice` / `fxRate` pair, so China-cost vs. sell-price margin can be analysed
without re-deriving it. Product images resolve deterministically as
`/images/products/{sku}.jpg`.

### CSV columns

```
site,sku,category,title_en,title_local,unit,moq,price_minor,cny_ref_price,fx_rate,description,specs_json
```

`price_minor` is in **minor units** of the site currency (INR paise), so
`111475` = INR 1,114.75. `fx_rate` records the PKR→INR rate the price was
converted at. `specs_json` accepts either a JSON object or the shorthand
`key=value|key=value`.

---

## Project structure

```
src/
  app/
    [site]/              Multi-site storefront (currently only "in")
      products/          Catalog list + SKU detail
      cart/              Cart (server-validated)
      payment/           Post-order instructions
      orders/            Buyer order history + detail
      account/ login/ register/
    dashboard/           Role-gated back office
      orders/ buyers/ notifications/
    api/
      auth/              login, logout, register
      orders/            create order, transition status
  catalog/               Provider contract, CSV provider, 1688 stub, importer
  components/            UI components
  db/                    Drizzle schema, client, migrations runner, seed
  lib/                   Session, roles, order state machine, cart, email, formatting
data/seed/products.csv   Seed catalog (tracked)
drizzle/                 Generated SQL migrations (tracked)
docs/                    Deployment runbook and DNS/registrar notes
```

---

## Data model

[`src/db/schema.ts`](src/db/schema.ts) — SQLite via Drizzle.

| Table | Purpose |
| --- | --- |
| `sites` | Per-country storefront config: brand, currency, order prefix, tax label, notify list, order sequence |
| `users` | All roles in one table, discriminated by `role`; buyers/partners carry `site_id` |
| `products` | Normalized catalog, unique on `(site_id, sku)` |
| `orders` | Header + frozen `buyer_snapshot_json`; unique `order_no` |
| `order_items` | Lines with `moq_at_order` and the price as sold |
| `notifications` | In-app feed for order creation and status changes |
| `order_emails` | Delivery log: `recorded` / `sent` / `failed` |

Money is stored as **integer minor units** everywhere. `fx_rate` and `cny_ref_price`
are the only floats, and they are analytics-only — never used to compute a charged price.

---

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local`.

| Variable | Required | Notes |
| --- | --- | --- |
| `SESSION_SECRET` | **Yes in production** | HS256 signing key. Dev falls back to a hardcoded value; production **throws** if unset. Generate with `openssl rand -hex 32`. |
| `DATABASE_PATH` | No | Defaults to `./data/pintaback.db` |
| `SEED_CATALOG_FILE` | No | Defaults to `data/seed/products.csv` |
| `EMAIL_PROVIDER` | No | `resend` to send; empty records in-app only |
| `RESEND_API_KEY` / `RESEND_FROM` | No | Required if `EMAIL_PROVIDER=resend` |

---

## Deployment notes

**Read [docs/deployment.md](docs/deployment.md) before choosing a host.** The
short version:

- **`better-sqlite3` is a native module** and is listed in `serverExternalPackages`
  in [`next.config.ts`](next.config.ts). Serverless platforms have an ephemeral,
  mostly read-only filesystem, so **the database will not persist** — orders are
  lost on the first cold start. Use a host with a real mounted volume, or swap the
  Drizzle driver for Postgres/LibSQL first. `docs/deployment.md` lays out all three
  options and their costs.
- **Run migrations on deploy** (`npm run setup`, or `src/db/migrate.ts` directly).
- Set `SESSION_SECRET` — production refuses to start without it.
- **Delete the seeded demo accounts** before going live.
- The storefront and dashboard are rendered per-request (`dynamic = "force-dynamic"`),
  so they always reflect live catalog and order state.

Domain and DNS setup — including the registrar field mapping and how to avoid
breaking business email — is in [docs/dns-notes.md](docs/dns-notes.md).

---

## Known gaps

Tracked honestly so nothing here is mistaken for finished work:

- **No payment integration.** Orders are `type: "simulated"`; `payment/` shows
  offline instructions only.
- **No 1688 connector.** The provider is a documented stub.
- **Demo credentials ship in the seed** and demo users are re-created by
  `npm run setup` if missing.
- **Demo contact details are placeholders** (`example.com` addresses, a fake
  WhatsApp number) in `src/db/setup.ts` and `src/lib/sites.ts`.
- **Single site.** `SITE_SLUGS` is `["in"]`. The `[site]` routing, per-site catalog,
  per-site order prefix and per-site currency are all in place for a second market,
  but no second site is seeded.

---

## License

Proprietary — see [LICENSE](LICENSE). All rights reserved.
