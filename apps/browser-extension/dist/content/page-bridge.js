// src/content/page-bridge.ts
var AUA_VERSION = "1";
function postRouteChange(url) {
  window.postMessage(
    { type: "AUA_ROUTE_CHANGE", auaVersion: AUA_VERSION, url },
    window.location.origin
  );
}
function patchHistory() {
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);
  history.pushState = function(...args) {
    originalPushState(...args);
    postRouteChange(String(args[2] ?? ""));
  };
  history.replaceState = function(...args) {
    originalReplaceState(...args);
    postRouteChange(String(args[2] ?? ""));
  };
}
patchHistory();
export {
  patchHistory
};
//# sourceMappingURL=page-bridge.js.map
