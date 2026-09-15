# DNS notes — registrar ↔ platform field mapping

Field-name mapping and email-safety notes for pointing a domain at a hosting
platform. Written against **NameSilo + Vercel** (the combination used for the
first launch), but the mapping confusion is generic: registrars and platforms
name the same DNS fields differently, and the mismatch is the usual reason a
record "looks right" but never validates.

---

## 1. Field-name mapping

When a platform says "add this record", the value it gives you goes into a
**differently-named field** at the registrar.

| Platform says | NameSilo field | Example value |
| --- | --- | --- |
| CNAME → Value | **Target Hostname** | `<project-id>.vercel-dns-017.com` |
| A → Value | **IPv4 Address** | `76.76.21.21` (Vercel's standard anycast A record) |
| Host / Name | **Hostname** | `www`, or `@` / blank for the root domain |

Note the root domain: `@` and an empty hostname both mean the apex. Some
registrars reject `@` and want it blank, or vice versa — if one is rejected,
try the other.

---

## 2. A and CNAME cannot coexist on one hostname

This is the conflict that blocks most first attempts:

> A hostname may have either A/AAAA records **or** a CNAME — never both.

A fresh domain often ships with registrar parking A records already on `www`.
Adding the platform's CNAME then fails with a conflict that doesn't explain
itself.

**Fix:** delete the pre-existing A records on that hostname first, *then* add the
CNAME.

The first launch hit exactly this — `www` carried three parking A records
(`172.232.24.235`, `172.234.25.42`, `172.232.24.161`) that had to be removed
before the Vercel CNAME would take.

### The platform UI can lag behind reality

After deleting the conflicting records, the platform may **still** report a
conflict. This is a stale page, not a failed change. Trust the registrar's
actual record list and the end-to-end result (`curl` returning 200) over a
dashboard warning that persists after a refresh.

---

## 3. Protect the business email — do not switch nameservers

**If the domain carries business email, keep the registrar's nameservers.**

Moving a domain to a platform's DNS (`ns1.vercel-dns.com` etc.) replaces the
entire zone. Every record the email provider depends on goes with it — most
critically the **MX records** — and mail to the business address stops until
they are recreated correctly.

The safer path, and the one used for the first launch: **leave the nameservers
alone** and add only the two records the website needs (a CNAME on `www` and an
A record on the apex). The zone stays in the registrar's DNS, the MX records
are never touched, and the website resolves fine.

Records that must survive any DNS change, and are worth photographing before
you start:

| Type | Purpose | Typical value |
| --- | --- | --- |
| MX | Inbound mail | `mx1/mx2/mx3.<provider>.com` with priorities |
| TXT | SPF / DKIM / DMARC | provider-issued; deleting these silently breaks deliverability |
| CNAME | Provider's own verification / autodiscover | provider-issued |

**Verify after the change:** send a test message *to* the business address and
*make sure it arrives*. A website returning 200 says nothing about whether mail
still works.

---

## 4. TTL

TTL is only a cache lifetime. Any reasonable value works — `3600` and `7207`
are both fine, and different records on the same zone may use different values
without conflict.

Use whatever default the platform or registrar suggests. TTL does not affect
whether the platform validates the record, and does not affect email.

> Practical note: lowering TTL to ~300 *before* a planned cutover shortens the
> window in which a mistake is cached. Raise it back afterwards.

---

## 5. Verify from the outside

Local DNS is not a reliable test of a public DNS change.

The first launch produced a false alarm here: `*.vercel.app` resolved to an
unrelated IP (`173.255.209.47`, not a Vercel address) from one machine, so
`curl` timed out — while the real domain returned 200 the whole time. That is a
local resolver / network condition, **not** a reason to change platform
configuration.

Check the public result instead:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -L https://www.example.com   # expect 200
dig +short www.example.com CNAME                                      # expect the platform target
dig +short example.com A                                              # expect the apex A record
dig +short example.com MX                                             # expect the mail provider, unchanged
```

If local resolution disagrees with public DNS, the local resolver is wrong.
Confirm with an external resolver before touching anything:

```bash
dig @1.1.1.1 +short www.example.com
```
