// Public API surface for @aua/web-components (WP-003).
// WP-011 agents extend AuaElement and consume these utilities.

export { AuaElement } from "./base/AuaElement.js";
export { trapFocus, restoreFocus } from "./base/focus-manager.js";
export type {
  AccessibilityAdapter,
  AdaptationConfig,
  MountPoint,
  LifecycleEventDetail,
  LifecycleEventType,
} from "./types.js";

// Concrete adapters (WP-011)
export { A11yFieldProxy } from "./adapters/a11y-field-proxy.js";
export { A11yLiveRegion } from "./adapters/a11y-live-region.js";
export { mountAdapter } from "./adapters/mount.js";
