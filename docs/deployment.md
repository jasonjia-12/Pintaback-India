# Deployment runbook

Checklist for taking Pintaback from a local prototype to a live site.

Parts of this are distilled from an earlier launch of a **static** site, where
the DNS and Git steps were the whole job. Pintaback is not static — read
[Step 0](#step-0--decide-where-the-database-lives) before anything else,
because it is the one decision that can invalidate the rest of the plan.

---

## Step 0 — Decide where the database lives

**This is the blocker. Everything else is mechanical.**

Pintaback stores its data in a SQLite file via `better-sqlite3`
(`DATABASE_PATH`, default `./data/pintaback.db`). On a serverless platform the
filesystem is **read-only apart from a temporary directory that is discarded
between invocations**. A SQLite file written there does not persist: orders,
users and catalog rows disappear on the next cold start.

So the platform choice is really a database choice. Three honest options:

| Option | Code change | Trade-offs |
| --- | --- | --- |
| **Persistent-volume host** — Railway, Fly.io, Render with a disk, or a VPS | **None.** Keep `better-sqlite3` and the file. | Fastest path from the current code. Must run **a single instance** — SQLite in WAL mode is not safe for concurrent writers across machines. You own backups. |
| **Turso (libSQL)** | Swap the driver: `@libsql/client` + `drizzle-orm/libsql` in `src/db/index.ts`. SQLite dialect, so the schema and most migrations carry over. | Closest managed option to the current code. Every query becomes a network round-trip. |
| **Postgres** — Neon, Supabase, Vercel Postgres | Swap to `drizzle-orm/postgres-js`, and **regenerate migrations** for the pg dialect. | Best long-term fit for a multi-instance deploy. Largest change: `src/db/schema.ts` uses `sqlite-core` types throughout. |

Whichever you pick, `serverExternalPackages: ["better-sqlite3"]` in
[`next.config.ts`](../next.config.ts) only stays relevant for the first option.

> **Do not** deploy to a serverless platform on the current SQLite setup and
> treat the working local demo as evidence that it works there. It will appear
> to work until the first cold start, then silently lose orders — which, for an
> order-capture system, is worse than failing loudly.

---

## Step 1 — Repository

### Fly.io profile

The repository now includes `Dockerfile` and `fly.toml` for the persistent-volume
option. It deliberately runs one Fly Machine with a volume mounted at `/data`;
SQLite must not be scaled horizontally. Before the first deploy:

```bash
fly launch --no-deploy
fly volumes create pintaback_data --region sin --size 1
fly secrets set SESSION_SECRET="$(openssl rand -hex 32)"
fly deploy
```

The image runs migrations only at startup (`npm run db:migrate`); it does not run
`npm run setup`, so production demo users and seed data are not recreated.

Create the remote **empty** — no README, no `.gitignore`, no licence. A
pre-populated initial commit conflicts with the existing history.

```bash
git remote add origin git@github.com:<account>/<repo>.git
git push -u origin main
```

**Pitfalls:**

- Connecting a hosting platform to a repository that contains **zero commits**
  fails with `The provided GitHub repository does not contain the requested
  branch or commit reference.` Push first, connect second.
- If SSH fails with `Permission denied (publickey)`, switch to HTTPS. The first
  HTTPS push requires device authorisation: the terminal prints a code, and you
  enter it in the browser page it opens. **The code shown in the browser must
  match the one in the terminal** — that match is what confirms the request came
  from this machine.

---

## Step 2 — Secrets and configuration

Set these as environment variables **in the platform**, never in the repository.
`.gitignore` already excludes `.env*` while keeping `.env.example` tracked.

| Variable | Required | Notes |
| --- | --- | --- |
| `SESSION_SECRET` | **Yes** | `openssl rand -hex 32`. The app **throws on startup in production** if this is unset. Use a different value per environment. |
| `DATABASE_PATH` | On a persistent host | Point at the mounted volume, e.g. `/data/pintaback.db`. |
| `EMAIL_PROVIDER` | No | `resend` to actually send order notifications; leave empty to record in-app only. |
| `RESEND_API_KEY`, `RESEND_FROM` | If using Resend | `RESEND_FROM` must be a domain you have verified with the provider. |

**Before going live, deal with the demo accounts.** `npm run setup` creates four
users with published passwords (`buyer.in@example.com` / `Demo123!` and three
others — see the [README](../README.md#demo-accounts)). Either do not run the
seed against production, or delete them immediately afterwards. They are also
recreated by `npm run setup` if missing, so a routine re-seed on a live system
will resurrect them.

---

## Step 3 — Migrate and seed

```bash
npm run setup          # migrate + seed sites, users, catalog (idempotent)
# or, catalog only:
npm run import:csv
```

Confirm afterwards: the `sites` row exists with the expected `currency` and
`order_prefix`, `products` has rows, and a buyer account can sign in.

---

## Step 4 — Domain and DNS

See **[dns-notes.md](dns-notes.md)** for the registrar field mapping, the
A/CNAME conflict, and — if the domain carries business email — why you should
**not** move the nameservers.

Short version: add a CNAME on `www` and an A record on the apex, leave the
zone's MX and TXT records untouched.

---

## Step 5 — Verify

```bash
# Site is up, and the apex redirects to www
curl -s -o /dev/null -w "%{http_code}\n" -L https://www.example.com    # expect 200
curl -s -o /dev/null -w "%{http_code}\n"    https://example.com        # expect 301
```

Then verify the things a status code cannot tell you:

- [ ] **Sign in** as a buyer and submit a test order. It should appear in
      `/dashboard` for the partner account and in the buyer's `/orders`.
- [ ] **Order number** is allocated with the site prefix (`SO-IN-0001`) and does
      not repeat.
- [ ] **Email**: check the `order_emails` table — `mode` should be `sent` if
      Resend is configured, `recorded` if not, and **`failed` means
      notifications are silently not reaching anyone.**
- [ ] **Business email still works** — send a message to the address and confirm
      it arrives. A 200 from the website says nothing about MX.
- [ ] **Data survives a restart** — redeploy (or force a cold start) and confirm
      the test order is still there. This is the check that catches the Step 0
      mistake.
- [ ] **Delete the test order** and any demo accounts before handing over.

---

## Step 6 — Ongoing updates

Push to `main` and let the platform rebuild, or run the build yourself on a
persistent host:

```bash
git add -A && git commit -m "..." && git push
```

Keep `npm run typecheck` and `npm run build` green before pushing — the current
tree builds with **0 errors** and 14 lint warnings.

---

## Backups

If you took the persistent-volume option, **the database file is now the only
copy of your order data.** SQLite in WAL mode means the live state is spread
across `pintaback.db` plus `pintaback.db-wal`, so copying the `.db` file alone
while the app is running can capture a torn snapshot.

Back up properly with the SQLite backup command, which is safe on a live
database:

```bash
sqlite3 /data/pintaback.db ".backup '/backups/pintaback-$(date +%F).db'"
```

Schedule it, and **test a restore** — an untested backup is not a backup.
