// Real end-to-end check: launches Chromium with the unpacked extension
// actually loaded (not jsdom), opens the demo page over http:// (avoids the
// file:// "allow file access" per-extension permission entirely), and
// inspects the live DOM for the injected <a11y-field-proxy> elements.
//
// Run: node e2e/pocket-demo.e2e.mjs
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const extensionPath = join(repoRoot, "apps", "browser-extension");
const demoDir = join(repoRoot, "demo");

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };

function startDemoServer(port) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const path = req.url === "/" ? "/inaccessible-form.html" : req.url;
      try {
        const filePath = join(demoDir, decodeURIComponent(path.split("?")[0]));
        const body = await readFile(filePath);
        res.writeHead(200, { "Content-Type": MIME[extname(filePath)] ?? "text/plain" });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });
    server.listen(port, () => resolve(server));
  });
}

async function main() {
  const port = 4173;
  const server = await startDemoServer(port);
  console.log(`[e2e] demo server up at http://localhost:${port}/`);
  console.log(`[e2e] loading extension from ${extensionPath}`);

  // Extensions require a persistent context + a real (non-headless-shell)
  // Chromium, headed — MV3 unpacked extension loading is not supported in
  // Playwright's default headless mode.
  const userDataDir = join(repoRoot, ".playwright-profile");
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  const page = await context.newPage();

  const consoleMessages = [];
  page.on("console", (msg) => consoleMessages.push(`[console:${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => consoleMessages.push(`[pageerror] ${err.stack ?? err.message}`));
  page.on("requestfailed", (req) =>
    consoleMessages.push(`[requestfailed] ${req.url()} — ${req.failure()?.errorText}`)
  );
  page.on("response", (res) => {
    if (res.status() >= 400) consoleMessages.push(`[response ${res.status()}] ${res.url()}`);
  });

  await page.goto(`http://localhost:${port}/inaccessible-form.html`);
  // Give the content script + MutationObserver a moment to run.
  await page.waitForTimeout(1500);

  const proxyCount = await page.locator("a11y-field-proxy").count();
  const liveRegionCount = await page.locator("a11y-live-region").count();
  const proxyLabels = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a11y-field-proxy")).map((el) =>
      el.getAttribute("label")
    )
  );

  console.log("\n──────── RESULT ────────");
  console.log("a11y-field-proxy count:", proxyCount);
  console.log("a11y-field-proxy labels:", proxyLabels);
  console.log("a11y-live-region count:", liveRegionCount);
  console.log("\n──────── PAGE CONSOLE / ERRORS ────────");
  consoleMessages.forEach((m) => console.log(m));
  console.log("────────────────────────\n");

  if (proxyCount === 3) {
    console.log("[e2e] PASS — barrier detected and resolved for all 3 fields.");
  } else {
    console.log(`[e2e] FAIL — expected 3 a11y-field-proxy elements, found ${proxyCount}.`);
  }

  await context.close();
  server.close();
  process.exit(proxyCount === 3 ? 0 : 1);
}

main().catch((err) => {
  console.error("[e2e] crashed:", err);
  process.exit(1);
});
