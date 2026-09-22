/**
 * Emits a composed, bubbling CustomEvent so WP-006 telemetry can observe
 * adapter lifecycle without coupling to adapter internals.
 */
export function emitLifecycle(host, type, detail) {
    host.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
}
//# sourceMappingURL=lifecycle-emitter.js.map