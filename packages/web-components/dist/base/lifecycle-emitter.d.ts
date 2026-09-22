import type { LifecycleEventDetail, LifecycleEventType } from "../types.js";
/**
 * Emits a composed, bubbling CustomEvent so WP-006 telemetry can observe
 * adapter lifecycle without coupling to adapter internals.
 */
export declare function emitLifecycle(host: Element, type: LifecycleEventType, detail: LifecycleEventDetail): void;
//# sourceMappingURL=lifecycle-emitter.d.ts.map