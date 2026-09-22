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
