/**
 * Snapshot the public pages of a running Pintaback dev server into a
 * self-contained static site.
 *
 * Output is a FLAT structure with purely relative asset paths, so it works at
 * any base path (e.g. a GitHub Pages project site at /<repo>/, or just opening
 * index.html from disk).
 *
 *   node ptb-snapshot.mjs <outdir> [origin]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const NO_NOTICE = argv.includes("--no-notice");
const STRIP_COST = argv.includes("--strip-cost");
const OUT = argv.find((a) => !a.startsWith("--"));
const ORIGIN = argv.find((a, i) => !a.startsWith("--") && i > argv.indexOf(OUT)) ?? "http://localhost:3100";
if (!OUT) throw new Error("usage: node ptb-snapshot.mjs <outdir> [origin] [--no-notice] [--strip-cost]");

// Every product page renders the "China reference" row: the CNY sourcing cost
// next to the INR selling price. On a public URL that publishes the margin
// structure to anyone — including the reseller being shown the preview.
// --strip-cost drops that one row. Off by default so the design stays faithful.
const COST_ROW = /<div[^>]*><dt[^>]*>China reference<\/dt><dd[^>]*>[\s\S]*?<\/dd><\/div>/g;

// Scripts are stripped, so every button on these pages is inert. Without a
// word of explanation a viewer clicks "Add to cart", nothing happens, and the
// design reads as broken. One line at the top prevents that misreading.
const NOTICE = `<div style="background:var(--color-ochre-soft,#f7eedd);color:var(--color-ochre,#9a6b2f);border-bottom:1px solid #e6d5b8;font:600 11px/1.5 ui-sans-serif,system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;text-align:center;padding:8px 16px">Design preview &middot; static mock-up &mdash; sign-in, cart and ordering are not live</div>`;

const SKUS = [
  "in-hk-001", "in-hk-002", "in-hk-003", "in-hk-004",
  "in-tl-001", "in-tl-002", "in-tl-003", "in-tl-004",
];

// The products page filters by category via ?category=<name>. Each filter gets
// its own snapshot so the two category links on the home page actually work.
const CATEGORIES = [
  { route: "/in/products?category=Home%20%26%20Kitchen", match: "Home & Kitchen", file: "products-home-kitchen.html", label: "Products — Home & Kitchen" },
  { route: "/in/products?category=Tools%20%26%20Hardware", match: "Tools & Hardware", file: "products-tools-hardware.html", label: "Products — Tools & Hardware" },
];

// route -> flat output filename
const PAGES = [
  { route: "/in", file: "index.html", label: "Home" },
  { route: "/in/products", file: "products.html", label: "All products" },
  ...CATEGORIES,
  ...SKUS.map((s) => ({ route: `/in/products/${s}`, file: `product-${s}.html`, label: `Product ${s}` })),
  { route: "/in/login", file: "login.html", label: "Sign in" },
  { route: "/in/register", file: "register.html", label: "Create account" },
  { route: "/in/cart", file: "cart.html", label: "Cart" },
  { route: "/in/payment", file: "payment.html", label: "Payment" },
];

// Pages that exist in the app but require a signed-in session. A static copy
// cannot sign in, so links to them are pointed at the product list instead.
const LOGIN_WALLED = /^\/(in\/(orders|account|checkout)|dashboard)/;

const warnings = new Set();

/**
 * Map one app-absolute URL onto the flat snapshot layout.
 * Returns the replacement string, or null to leave the URL untouched.
 */
function mapUrl(u) {
  if (!u.startsWith("/") || u.startsWith("//")) return null; // relative / external / protocol-relative
  if (u.startsWith("/_next/")) return null;                   // stripped with its tag

  const h = u.indexOf("#");
  const frag = h >= 0 ? u.slice(h) : "";
  const noFrag = h >= 0 ? u.slice(0, h) : u;
  const q = noFrag.indexOf("?");
  const query = q >= 0 ? noFrag.slice(q + 1) : "";
  let p = q >= 0 ? noFrag.slice(0, q) : noFrag;
  if (p.length > 1) p = p.replace(/\/+$/, ""); // /in/ and /in are the same page

  if (p === "/favicon.ico") return "favicon.ico" + frag;
  if (p.startsWith("/images/")) return p.slice(1) + frag;

  const sku = p.match(/^\/in\/products\/(in-[a-z]{2}-\d{3})$/);
  if (sku) return `product-${sku[1]}.html` + frag;

  if (p === "/in/products") {
    if (query) {
      let decoded = query;
      try { decoded = decodeURIComponent(query); } catch { /* keep raw */ }
      const cat = CATEGORIES.find((c) => decoded.includes(c.match));
      if (cat) return cat.file + frag;
      warnings.add(`unknown category filter: ${query}`);
    }
    return "products.html" + frag;
  }

  const flat = {
    "/in": "index.html",
    "/in/login": "login.html",
    "/in/register": "register.html",
    "/in/cart": "cart.html",
    "/in/payment": "payment.html",
  };
  if (flat[p]) return flat[p] + frag;

  if (LOGIN_WALLED.test(p)) return "products.html" + frag;

  warnings.add(`unmapped internal link: ${p}`);
  return null;
}

/** Rewrite every href/src attribute and url(...) in one pass. */
function rewriteUrls(html) {
  // srcset holds a comma-separated candidate list: "a.jpg 1x, b.jpg 2x"
  html = html.replace(/\bsrcset="([^"]*)"/gi, (full, list) => {
    const out = list.split(",").map((cand) => {
      const m = cand.match(/^(\s*)(\S+)([\s\S]*)$/);
      if (!m) return cand;
      const mapped = mapUrl(m[2]);
      return m[1] + (mapped ?? m[2]) + m[3];
    }).join(",");
    return `srcset="${out}"`;
  });

  // url(/...) inside inline styles and <style> blocks
  html = html.replace(/url\((['"]?)(\/[^)'"]*)\1\)/gi, (full, q, u) => {
    const mapped = mapUrl(u);
    return mapped === null ? full : `url(${q}${mapped}${q})`;
  });

  html = html.replace(/\b(href|src|action|poster)="([^"]*)"/gi, (full, attr, val) =>
    (() => { const m = mapUrl(val); return m === null ? full : `${attr}="${m}"`; })());

  return html;
}

function rewrite(html, file) {
  let out = html;

  // Drop every script tag. The pages are fully server-rendered, so markup and
  // styles are complete without Next's dev HMR client + hydration payload.
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<script\b[^>]*\/>/gi, "");

  // Drop preload/prefetch hints pointing at now-missing JS chunks.
  out = out.replace(/<link\b[^>]*rel="(preload|prefetch|modulepreload)"[^>]*>/gi, "");

  // One local stylesheet replaces Next's chunked one.
  out = out.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi,
    '<link rel="stylesheet" href="assets/style.css">');

  out = rewriteUrls(out);

  // Mark the copy so nobody mistakes it for the live app.
  out = out.replace("<head>",
    `<head>\n<!-- STATIC DESIGN SNAPSHOT of Pintaback (${file}). Generated for design\n     review only. Sign-in, cart, ordering and the dashboard are NOT functional\n     here — there is no server behind this copy. -->`);

  if (!NO_NOTICE) out = out.replace(/(<body[^>]*>)/i, `$1\n${NOTICE}`);

  if (STRIP_COST) {
    if (COST_ROW.test(out)) costRows++;
    COST_ROW.lastIndex = 0;
    out = out.replace(COST_ROW, "");
  }

  return out;
}

const fetchText = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
};

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });

// ---- 1. CSS
//
// The stylesheet is not standalone: next/font emits @font-face rules whose
// `src: url("../media/<hash>.woff2")` is relative to the CSS file's ORIGINAL
// location (/_next/static/chunks/). Copying the CSS alone silently drops the
// webfonts and the page falls back to system fonts — which changes how the
// design actually looks. So: pull every url() the sheet references, and
// rewrite it to a local path.
const firstHtml = await fetchText(ORIGIN + "/in");
const cssMatch = firstHtml.match(/\/_next\/static\/chunks\/[^"']*?\.css/);
if (!cssMatch) throw new Error("no stylesheet found in page HTML");
const cssUrl = new URL(cssMatch[0], ORIGIN);
let css = await fetchText(cssUrl.href);
console.log(`css   ${cssMatch[0]}\n   -> assets/style.css  (${css.length} bytes)`);

fs.mkdirSync(path.join(OUT, "assets", "fonts"), { recursive: true });
const urlRefs = new Set();
css = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, q, ref) => {
  if (/^(data:|https?:|\/\/)/i.test(ref)) return full; // already inline or external
  urlRefs.add(ref);
  return `url("fonts/${path.basename(ref)}")`;
});

let fontOk = 0;
const fontFail = [];
for (const ref of urlRefs) {
  const abs = new URL(ref, cssUrl); // resolve against the sheet's real location
  const name = path.basename(abs.pathname);
  try {
    const res = await fetch(abs.href);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fs.writeFileSync(path.join(OUT, "assets", "fonts", name),
      Buffer.from(await res.arrayBuffer()));
    fontOk++;
  } catch (e) {
    fontFail.push(`${name}: ${e.message}`);
  }
}
fs.writeFileSync(path.join(OUT, "assets", "style.css"), css);
console.log(`font  ${fontOk}/${urlRefs.size} assets from the stylesheet -> assets/fonts/`);
for (const f of fontFail) console.log(`font  FAILED ${f}`);

// ---- 2. favicon (served from src/app/favicon.ico)
try {
  const res = await fetch(ORIGIN + "/favicon.ico");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(OUT, "favicon.ico"), buf);
  console.log(`ico   /favicon.ico -> favicon.ico (${buf.length} bytes)`);
} catch (e) {
  console.log(`ico   FAILED: ${e.message} — the <link rel="icon"> will 404`);
}

// ---- 3. pages
let ok = 0;
let costRows = 0;
for (const p of PAGES) {
  try {
    const html = await fetchText(ORIGIN + p.route);
    fs.writeFileSync(path.join(OUT, p.file), rewrite(html, p.file));
    console.log(`page  ${p.file.padEnd(28)} ${String(html.length).padStart(7)}b`);
    ok++;
  } catch (e) {
    console.log(`page  ${p.file.padEnd(28)} FAILED: ${e.message}`);
  }
}

// ---- 4. the preview's own README. Copied in rather than written by hand,
//         because the rmSync at the top of this script wipes the output dir —
//         a hand-written README would silently vanish on the next run.
// fileURLToPath, not URL.pathname: this repo's path contains non-ASCII
// characters, which pathname leaves percent-encoded and existsSync can't stat.
const readmeSrc = path.join(path.dirname(fileURLToPath(import.meta.url)), "PREVIEW-README.md");
if (fs.existsSync(readmeSrc)) {
  fs.copyFileSync(readmeSrc, path.join(OUT, "README.md"));
  console.log(`doc   PREVIEW-README.md -> README.md`);
} else {
  console.log(`doc   no PREVIEW-README.md next to the script — output has no README`);
}

// ---- 5. GitHub Pages: without .nojekyll the branch is run through Jekyll,
//         which skips anything starting with "_" and rewrites what it does not
//         skip. This output has no such paths today, but the file costs nothing
//         and removes a whole class of "works locally, wrong on Pages" bugs.
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
console.log(`doc   .nojekyll created`);

// ---- 6. image tree, verbatim
const SRC_IMG = path.join(process.cwd(), "public", "images");
if (!fs.existsSync(SRC_IMG)) throw new Error(`missing image source dir: ${SRC_IMG}`);
fs.cpSync(SRC_IMG, path.join(OUT, "images"), { recursive: true });
const countFiles = (d) => fs.readdirSync(d, { withFileTypes: true })
  .reduce((n, e) => n + (e.isDirectory() ? countFiles(path.join(d, e.name)) : 1), 0);
console.log(`img   public/images -> images/  (${countFiles(SRC_IMG)} files)`);

if (STRIP_COST) console.log(`cost  ${costRows} "China reference" rows removed`);

if (warnings.size) {
  console.log(`\nWARNINGS (${warnings.size}):`);
  for (const w of warnings) console.log(`  - ${w}`);
}
console.log(`\n${ok}/${PAGES.length} pages written to ${OUT}`);
