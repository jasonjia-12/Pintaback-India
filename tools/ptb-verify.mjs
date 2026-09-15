/** Verify the generated static snapshot is self-contained. */
import fs from "node:fs";
import path from "node:path";

const DIR = process.argv[2];
if (!DIR) throw new Error("usage: node ptb-verify.mjs <snapshotdir>");

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".html"));
let fail = 0;
const bad = (msg) => { console.log("  FAIL  " + msg); fail++; };
const ok = (msg) => console.log("  ok    " + msg);

// ---- 1. no root-relative URLs left anywhere
const abs = new Set();
for (const f of files) {
  const html = fs.readFileSync(path.join(DIR, f), "utf8");
  for (const m of html.matchAll(/\b(?:href|src|action|poster)="(\/[^"]*)"/g)) abs.add(m[1]);
  for (const m of html.matchAll(/url\(\s*['"]?(\/[^)'"]*)/g)) abs.add(m[1]);
  for (const m of html.matchAll(/\bsrcset="([^"]*)"/g))
    for (const c of m[1].split(",")) { const u = c.trim().split(/\s+/)[0]; if (u.startsWith("/")) abs.add(u); }
}
abs.size === 0 ? ok("no root-relative URLs remain")
  : bad(`root-relative URLs remain: ${[...abs].slice(0, 10).join(", ")}`);

// ---- 2. no scripts, no _next references
const scriptFiles = [], nextRefs = new Set();
for (const f of files) {
  const html = fs.readFileSync(path.join(DIR, f), "utf8");
  if (/<script/i.test(html)) scriptFiles.push(f);
  for (const m of html.matchAll(/_next\/[^"'\s)]*/g)) nextRefs.add(m[0]);
}
scriptFiles.length === 0 ? ok("no <script> tags remain") : bad(`<script> in: ${scriptFiles.join(", ")}`);
nextRefs.size === 0 ? ok("no /_next/ references remain") : bad(`/_next/ refs: ${[...nextRefs].slice(0, 5).join(", ")}`);

// ---- 3. every in-site link and asset target exists on disk
const missing = new Set();
let linkCount = 0;
for (const f of files) {
  const html = fs.readFileSync(path.join(DIR, f), "utf8");
  const vals = [];
  for (const m of html.matchAll(/\b(?:href|src)="([^"]*)"/g)) vals.push(m[1]);
  for (const m of html.matchAll(/\bsrcset="([^"]*)"/g))
    for (const c of m[1].split(",")) vals.push(c.trim().split(/\s+/)[0]);
  for (let v of vals) {
    if (!v || v.startsWith("#") || /^[a-z]+:/i.test(v) || v.startsWith("//")) continue;
    v = v.split("#")[0].split("?")[0];
    if (!v) continue;
    linkCount++;
    if (!fs.existsSync(path.join(DIR, v))) missing.add(`${v}  (in ${f})`);
  }
}
missing.size === 0 ? ok(`all ${linkCount} link/asset references resolve on disk`)
  : bad(`missing targets:\n        ${[...missing].slice(0, 15).join("\n        ")}`);

// ---- 4. stylesheet is present and substantial
const css = path.join(DIR, "assets", "style.css");
if (!fs.existsSync(css)) bad("assets/style.css missing");
else {
  const n = fs.statSync(css).size;
  // Tailwind v4 escapes brackets: .text-\[32px\] — search the raw values instead
  const cssText = fs.readFileSync(css, "utf8");
  const probes = ["32px", "44px", "52px", "1.12"];
  const gone = probes.filter((p) => !cssText.includes(p));
  gone.length === 0 ? ok(`assets/style.css ${n}b, responsive/typography rules present`)
    : bad(`assets/style.css ${n}b but missing: ${gone.join(", ")}`);

  // Every url() inside the sheet — fonts especially. A stylesheet that loads
  // fine but whose @font-face files 404 looks like it works, and quietly
  // renders the whole site in a fallback font.
  const cssUrlMissing = new Set();
  let cssUrlCount = 0;
  for (const m of cssText.matchAll(/url\(\s*['"]?([^'")]+)/g)) {
    const ref = m[1];
    if (/^(data:|https?:|\/\/)/i.test(ref)) continue;
    cssUrlCount++;
    if (!fs.existsSync(path.join(DIR, "assets", ref))) cssUrlMissing.add(ref);
  }
  cssUrlMissing.size === 0
    ? ok(`${cssUrlCount} stylesheet url() refs all resolve (fonts included)`)
    : bad(`stylesheet url() missing on disk: ${[...cssUrlMissing].slice(0, 8).join(", ")}`);

  const faces = (cssText.match(/@font-face/g) || []).length;
  const localFonts = fs.existsSync(path.join(DIR, "assets", "fonts"))
    ? fs.readdirSync(path.join(DIR, "assets", "fonts")).length : 0;
  faces > 0
    ? ok(`${faces} @font-face rules, ${localFonts} local font files`)
    : bad("no @font-face rules found — webfonts were dropped");
}

// ---- 5. page inventory
console.log(`  info  ${files.length} pages, ${fs.readdirSync(path.join(DIR, "images"), { recursive: true }).length} image entries`);

process.exit(fail ? 1 : 0);
