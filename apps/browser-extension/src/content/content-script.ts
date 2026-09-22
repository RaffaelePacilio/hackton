// content-script.ts — runs in the ISOLATED WORLD of the extension.
// Responsibilities:
//   1. Observe DOM mutations (MutationObserver)
//   2. Inject page-bridge.js into the page context for SPA route change detection
//   3. Listen for versioned postMessage events from the bridge
//   4. Build/maintain the SemanticPageModel (WP-007)

import type { SemanticPageModel } from "@aua/contracts";
import type { A11yFieldProxy, A11yLiveRegion } from "@aua/web-components";
import "@aua/web-components";
import { SemanticModelBuilder } from "../semantic-model/index.js";

const AUA_VERSION = "1";

const builder = new SemanticModelBuilder();

// ── Pocket demo: detect the "missing accessible name" barrier on form fields
// and resolve it with the inject_field_proxy skill (packages/skill-sdk/registry/
// inject_field_proxy.json), mounting the already-built <a11y-field-proxy>
// adapter next to the offending field. Hand-wired for the demo — the full
// pipeline (barrier-detection → agent-runtime → skill-sdk executor →
// verification-engine) is not yet connected end-to-end (see
// aua/docs/agent-prompts-v2/99-vertical-slice-integration.md).
let liveRegion: A11yLiveRegion | null = null;
let proxyCounter = 0;

function ensureLiveRegion(): A11yLiveRegion {
  if (liveRegion && liveRegion.isConnected) return liveRegion;
  if (!document.body.id) document.body.id = "aua-body-anchor";
  const region = document.createElement("a11y-live-region") as A11yLiveRegion;
  region.targetElementId = document.body.id;
  document.body.appendChild(region);
  liveRegion = region;
  return region;
}

function hasAccessibleName(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (el.getAttribute("aria-label")?.trim()) return true;
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy && document.getElementById(labelledBy)?.textContent?.trim()) return true;
  if (el.labels) {
    for (const label of Array.from(el.labels)) {
      if (label.textContent?.trim()) return true;
    }
  }
  return false;
}

function guessLabel(el: HTMLInputElement | HTMLTextAreaElement): string {
  const placeholder = el.getAttribute("placeholder");
  if (placeholder?.trim()) return placeholder.trim();
  const name = el.getAttribute("name");
  if (name?.trim()) return name.trim().replace(/[-_]+/g, " ");
  return "Campo senza etichetta";
}

function resolveMissingLabelBarriers(): void {
  const fields = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    "input:not([type=hidden]):not([data-aua-proxied]), textarea:not([data-aua-proxied])"
  );

  fields.forEach((el) => {
    if (el.closest("a11y-field-proxy")) return;
    el.setAttribute("data-aua-proxied", "true");
    if (hasAccessibleName(el)) return;

    if (!el.id) el.id = `aua-field-${++proxyCounter}`;
    const label = guessLabel(el);

    const proxy = document.createElement("a11y-field-proxy") as A11yFieldProxy;
    proxy.targetElementId = el.id;
    proxy.setAttribute("label", label);
    if (el instanceof HTMLInputElement && el.type) {
      proxy.setAttribute("field-type", el.type);
    }
    proxy.setAttribute("value", el.value ?? "");

    proxy.addEventListener("a11y-value-change", (event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail;
      el.value = detail.value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });

    el.insertAdjacentElement("afterend", proxy);

    ensureLiveRegion().announce(
      `Barriera di accessibilità rilevata e risolta: campo "${label}" senza etichetta — aggiunta versione accessibile.`,
      6000
    );
  });
}

// Latest built model — module-level so future consumers (transport, barrier
// detection, ...) can read it without this content script owning delivery.
// Wiring that transport is out of scope for WP-007.
let currentModel: SemanticPageModel | null = null;

export function getCurrentModel(): SemanticPageModel | null {
  return currentModel;
}

function injectPageBridge(): void {
  const bridgeUrl = chrome.runtime.getURL("dist/content/page-bridge.js");
  const script = document.createElement("script");
  script.src = bridgeUrl;
  script.type = "module";
  (document.head ?? document.documentElement).appendChild(script);
}

function handleBridgeMessage(event: MessageEvent): void {
  // Origin check — silently drop any message not from the current page origin
  if (event.origin !== window.location.origin) return;

  const data = event.data as Record<string, unknown> | null;
  if (
    typeof data !== "object" ||
    data === null ||
    data["auaVersion"] !== AUA_VERSION
  ) {
    return;
  }

  if (data["type"] === "AUA_ROUTE_CHANGE") {
    // Route changes invalidate incremental diffing — full rebuild per ADR-003.
    currentModel = builder.buildFull(document, window.location.pathname);
  }
}

function init(): void {
  injectPageBridge();

  window.addEventListener("message", handleBridgeMessage);

  currentModel = builder.buildFull(document, window.location.pathname);
  resolveMissingLabelBarriers();

  const observer = new MutationObserver((mutations) => {
    currentModel = builder.buildIncremental(mutations);
    resolveMissingLabelBarriers();
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
  });
}

init();
