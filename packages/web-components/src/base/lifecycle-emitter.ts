import type { LifecycleEventDetail, LifecycleEventType } from "../types.js";

/**
 * Emits a composed, bubbling CustomEvent so WP-006 telemetry can observe
 * adapter lifecycle without coupling to adapter internals.
 */
export function emitLifecycle(
  host: Element,
  type: LifecycleEventType,
  detail: LifecycleEventDetail
): void {
  host.dispatchEvent(
    new CustomEvent(type, { bubbles: true, composed: true, detail })
  );
}
