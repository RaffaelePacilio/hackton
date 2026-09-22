// page-bridge.ts — runs in the PAGE context (injected via web_accessible_resources).
// Monkey-patches history.pushState and history.replaceState so the content script
// (isolated world) can observe SPA route changes via postMessage.
// Never uses eval. No external imports.

const AUA_VERSION = "1";

function postRouteChange(url: string): void {
  window.postMessage(
    { type: "AUA_ROUTE_CHANGE", auaVersion: AUA_VERSION, url },
    window.location.origin
  );
}

export function patchHistory(): void {
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    originalPushState(...args);
    postRouteChange(String(args[2] ?? ""));
  };

  history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
    originalReplaceState(...args);
    postRouteChange(String(args[2] ?? ""));
  };
}

// Auto-invoke when loaded as a script tag
patchHistory();
