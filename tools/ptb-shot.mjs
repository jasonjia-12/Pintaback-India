/**
 * Full-page screenshot with real device emulation, via Chrome DevTools Protocol.
 * Using --window-size alone is wrong on macOS: the OS enforces a minimum window
 * width, so a "390px" window actually lays out wider and the capture is cropped.
 *
 *   node ptb-shot.mjs <out.png> <url> <width> [height]
 */
import { spawn } from "node:child_process";
import fs from "node:fs";

const [out, url, wStr, hStr] = process.argv.slice(2);
const WIDTH = Number(wStr ?? 390);
const MAXH = Number(hStr ?? 6000);
if (!out || !url) throw new Error("usage: node ptb-shot.mjs <out.png> <url> <width> [maxheight]");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9500 + (Math.abs([...url].reduce((a, c) => a + c.charCodeAt(0), 0)) % 400);

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--hide-scrollbars", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=/tmp/ptb-chrome-shot`, "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (p) return p;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error("chrome debug target never appeared");
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
  await rpc(ws, "Emulation.setDeviceMetricsOverride",
    { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: WIDTH < 700 });
  await rpc(ws, "Page.navigate", { url });
  await sleep(3500); // images + fonts + layout settle

  const m = await rpc(ws, "Runtime.evaluate", {
    expression: "JSON.stringify({h: Math.ceil(document.documentElement.scrollHeight), w: document.documentElement.scrollWidth})",
    returnByValue: true,
  });
  const { h, w } = JSON.parse(m.result.value);
  const height = Math.min(h, MAXH);

  await rpc(ws, "Emulation.setDeviceMetricsOverride",
    { width: WIDTH, height, deviceScaleFactor: 1, mobile: WIDTH < 700 });

  const shot = await rpc(ws, "Page.captureScreenshot",
    { format: "png", captureBeyondViewport: true });
  fs.writeFileSync(out, Buffer.from(shot.data, "base64"));
  console.log(`  ok  ${out.split("/").pop().padEnd(26)} ${WIDTH}x${height}  (page ${w}x${h}, overflow ${w - WIDTH})`);
  ws.close();
} catch (e) {
  console.error("  FAIL", out, e.message);
  process.exitCode = 1;
} finally {
  chrome.kill();
}
