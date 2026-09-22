// content-script.ts — runs in the ISOLATED WORLD of the extension.
// Responsibilities:
//   1. Observe DOM mutations (MutationObserver)
//   2. Inject page-bridge.js into the page context for SPA route change detection
//   3. Listen for versioned postMessage events from the bridge
//   4. Build/maintain the SemanticPageModel (WP-007)

import type { SemanticPageModel } from "@aua/contracts";
import { SemanticModelBuilder } from "../semantic-model/index.js";

const AUA_VERSION = "1";

const builder = new SemanticModelBuilder();

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

  const observer = new MutationObserver((mutations) => {
    currentModel = builder.buildIncremental(mutations);
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
  });
}

init();
