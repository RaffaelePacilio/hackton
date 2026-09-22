import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync } from "fs";

const outdir = "dist";

// Compile TypeScript entry points
await esbuild.build({
  entryPoints: [
    "src/background/service-worker.ts",
    "src/content/content-script.ts",
    "src/content/page-bridge.ts",
    "src/bootstrap/popup.ts",
  ],
  bundle: true,
  outdir,
  outbase: "src",
  format: "esm",
  target: "chrome120",
  platform: "browser",
  // No minification in dev builds — aids debugging
  minify: process.env.NODE_ENV === "production",
  sourcemap: true,
  // Prevent eval (CSP constraint)
  define: { "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development") },
});

// Copy static Bootstrap assets to dist/bootstrap/
mkdirSync("dist/bootstrap", { recursive: true });
copyFileSync("src/bootstrap/popup.html", "dist/bootstrap/popup.html");
copyFileSync("src/bootstrap/popup.css", "dist/bootstrap/popup.css");

console.log("Build complete → dist/");
