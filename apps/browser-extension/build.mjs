import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync } from "fs";

const outdir = "dist";

const common = {
  bundle: true,
  outdir,
  outbase: "src",
  target: "chrome120",
  platform: "browser",
  // No minification in dev builds — aids debugging
  minify: process.env.NODE_ENV === "production",
  sourcemap: true,
  // Prevent eval (CSP constraint)
  define: { "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development") },
};

// Chrome loads manifest `content_scripts[].js` entries as CLASSIC scripts —
// it does not support `"type": "module"` there (unlike the background
// service worker or a dynamically-injected <script type="module">). An ESM
// bundle for content-script.ts fails at runtime with
// "Uncaught SyntaxError: Unexpected token 'export'" because the top-level
// `export`/`import` syntax is illegal outside a module context. IIFE
// self-invokes with no top-level export/import, which is what a classic
// script requires.
await esbuild.build({
  ...common,
  entryPoints: ["src/content/content-script.ts", "src/content/main-world-barriers.ts"],
  format: "iife",
});

// These ARE loaded as ES modules: the service worker via
// manifest.json's background.type = "module", popup.ts via
// <script type="module"> in popup.html, and page-bridge.ts via a
// dynamically-created <script type="module"> tag (content-script.ts's
// injectPageBridge()).
await esbuild.build({
  ...common,
  entryPoints: [
    "src/background/service-worker.ts",
    "src/content/page-bridge.ts",
    "src/bootstrap/popup.ts",
  ],
  format: "esm",
});

// Copy static Bootstrap assets to dist/bootstrap/
mkdirSync("dist/bootstrap", { recursive: true });
copyFileSync("src/bootstrap/popup.html", "dist/bootstrap/popup.html");
copyFileSync("src/bootstrap/popup.css", "dist/bootstrap/popup.css");

console.log("Build complete → dist/");
