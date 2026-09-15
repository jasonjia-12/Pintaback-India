/**
 * Pixel-diff two PNG screenshots and report how many pixels differ.
 * Runs the comparison inside Chrome (canvas), so no image deps are needed.
 *
 *   node ptb-diff.mjs <a.png> <b.png> [diffOut.png]
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [a, b, diffOut] = process.argv.slice(2);
if (!a || !b) throw new Error("usage: node ptb-diff.mjs <a.png> <b.png> [diffout.png]");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9700;

const page = `<!doctype html><meta charset="utf-8"><body style="margin:0">
<canvas id="c"></canvas>
<script>
const A = ${JSON.stringify("file://" + path.resolve(a))};
const B = ${JSON.stringify("file://" + path.resolve(b))};
const load = (src) => new Promise((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("load " + src));
  i.src = src;
});
window.RESULT = null;
(async () => {
  const [ia, ib] = await Promise.all([load(A), load(B)]);
  const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
  const g = (img) => {
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    cx.fillStyle = "#fff"; cx.fillRect(0, 0, w, h);
    cx.drawImage(img, 0, 0);
    return cx.getImageData(0, 0, w, h).data;
  };
  const da = g(ia), db = g(ib);
  let diff = 0, maxDelta = 0;
  const out = new Uint8ClampedArray(da.length);
  // 16x16 buckets, to report WHERE the differences cluster
  const N = 16;
  const bw = Math.ceil(w / N), bh = Math.ceil(h / N);
  const buckets = new Map();
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let i = 0; i < da.length; i += 4) {
    const d = Math.max(Math.abs(da[i]-db[i]), Math.abs(da[i+1]-db[i+1]), Math.abs(da[i+2]-db[i+2]));
    if (d > 0) {
      diff++;
      const px = (i / 4) % w, py = Math.floor((i / 4) / w);
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
      const k = Math.floor(py / bh) * N + Math.floor(px / bw);
      buckets.set(k, (buckets.get(k) || 0) + 1);
    }
    if (d > maxDelta) maxDelta = d;
    const v = d === 0 ? 255 : 0;
    out[i] = 255; out[i+1] = v; out[i+2] = v; out[i+3] = 255;
  }
  const clusters = [...buckets.entries()]
    .sort((p, q) => q[1] - p[1]).slice(0, 8)
    .map(([k, n]) => ({
      at: "x" + (k % N) * bw + "-" + ((k % N) + 1) * bw + " y" + Math.floor(k / N) * bh + "-" + (Math.floor(k / N) + 1) * bh,
      px: n, pct: +(100 * n / diff).toFixed(1),
    }));
  const cv = document.getElementById("c");
  cv.width = w; cv.height = h;
  cv.getContext("2d").putImageData(new ImageData(out, w, h), 0, 0);
  window.RESULT = {
    sizeA: ia.width + "x" + ia.height, sizeB: ib.width + "x" + ib.height,
    canvas: w + "x" + h,
    diffPixels: diff, totalPixels: (da.length / 4), maxDelta,
    diffPct: +(100 * diff / (da.length / 4)).toFixed(4),
    bbox: diff ? (minX + "," + minY) + " -> (" + maxX + "," + maxY + ")" : "none",
    clusters,
    dataUrl: cv.toDataURL("image/png"),
  };
})().catch((e) => { window.RESULT = { error: e.message }; });
</script></body>`;

const tmpHtml = "/tmp/ptb-diff-page.html";
fs.writeFileSync(tmpHtml, page);

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--allow-file-access-from-files", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, "--user-data-dir=/tmp/ptb-chrome-diff",
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (p) return p;
    } catch {}
    await sleep(250);
  }
  throw new Error("no debug target");
}

let id = 0;
const rpc = (ws, method, params = {}) => {
  const myId = ++id;
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id !== myId) return;
      ws.removeEventListener("message", onMsg);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id: myId, method, params }));
  });
};

try {
  const t = await target();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", rej, { once: true });
  });
  await rpc(ws, "Page.enable");
  await rpc(ws, "Page.navigate", { url: "file://" + tmpHtml });
  await sleep(1000);

  let r;
  for (let i = 0; i < 90; i++) {
    r = await rpc(ws, "Runtime.evaluate", { expression: "window.RESULT && JSON.stringify(window.RESULT)", returnByValue: true });
    if (r.result.value) break;
    await sleep(700);
  }
  if (!r?.result?.value) throw new Error("diff never completed");
  const res = JSON.parse(r.result.value);
  if (res.error) throw new Error(res.error);

  console.log(`  ${path.basename(a)}  vs  ${path.basename(b)}`);
  console.log(`    sizes     ${res.sizeA} / ${res.sizeB}   canvas ${res.canvas}`);
  console.log(`    differing ${res.diffPixels} of ${res.totalPixels} px  (${res.diffPct}%)   maxChannelDelta ${res.maxDelta}`);
  console.log(`    bbox      ${res.bbox}`);
  for (const c of res.clusters) console.log(`      ${c.at.padEnd(22)} ${String(c.px).padStart(6)} px  ${c.pct}% of diffs`);

  if (diffOut) {
    fs.writeFileSync(diffOut, Buffer.from(res.dataUrl.split(",")[1], "base64"));
    console.log(`    diff map  ${diffOut}`);
  }
  ws.close();
} catch (e) {
  console.error("  FAIL", e.message);
  process.exitCode = 1;
} finally {
  chrome.kill();
}
