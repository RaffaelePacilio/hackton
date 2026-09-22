/**
 * Emits a composed, bubbling CustomEvent so WP-006 telemetry can observe
 * adapter lifecycle without coupling to adapter internals.
 *
 * `host` is the dispatch origin, not necessarily the adapter itself: on
 * unmount the adapter is already detached (disconnectedCallback fires after
 * removal), so callers must dispatch from a node still in the tree for the
 * event to bubble anywhere.
 */
export function emitLifecycle(host, type, detail) {
    host.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
}
//# sourceMappingURL=lifecycle-emitter.js.map