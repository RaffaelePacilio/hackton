// content-script.ts — runs in the ISOLATED WORLD of the extension.
// Responsibilities:
//   1. Observe DOM mutations (MutationObserver)
//   2. Inject page-bridge.js into the page context for SPA route change detection
//   3. Listen for versioned postMessage events from the bridge

const AUA_VERSION = "1";

// Stub — replaced in WP-007 (DOM Semantic Analysis)
function buildSemanticModel(_mutations?: MutationRecord[]): void {
  // no-op skeleton
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
    buildSemanticModel();
  }
}

function init(): void {
  injectPageBridge();

  window.addEventListener("message", handleBridgeMessage);

  const observer = new MutationObserver((mutations) => {
    buildSemanticModel(mutations);
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
  });
}

init();
