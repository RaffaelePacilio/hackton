var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _AuaElement_instances, _AuaElement_shadowRoot, _AuaElement_cleanupFocusTrap, _AuaElement_previouslyFocused, _AuaElement_mutationObserver, _AuaElement_clearShadowContent, _AuaElement_detail;
import { emitLifecycle } from "./lifecycle-emitter.js";
import { trapFocus, restoreFocus } from "./focus-manager.js";
// CSS injected into every adapter's closed Shadow DOM.
// Only CSS custom properties are exposed as the intentional theming API for WP-011 subclasses.
const BASE_CSS = `
  :host {
    all: initial;
    contain: layout style paint;
    z-index: var(--aua-z-index, 9000);
    isolation: isolate;
    display: block;
    box-sizing: border-box;
    font-family: var(--aua-font-family, inherit);
    font-size: var(--aua-font-size-base, 1rem);
    color: var(--aua-color-primary, inherit);
    background: var(--aua-color-surface, transparent);
  }
`;
function applyBaseStyles(shadow) {
    if (typeof CSSStyleSheet !== "undefined" &&
        "replaceSync" in CSSStyleSheet.prototype) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(BASE_CSS);
        shadow.adoptedStyleSheets = [sheet];
    }
    else {
        const style = document.createElement("style");
        style.textContent = BASE_CSS;
        shadow.appendChild(style);
    }
}
/**
 * Abstract base class for all AUA accessible adapter components (WP-003).
 *
 * Subclasses (built in WP-011) must implement:
 *   - get accessibleRole(): string  — ARIA role for the shadow-hosted control
 *   - get accessibleName(): string  — accessible name (non-empty before first paint)
 *   - render(shadowRoot): void      — populate the Shadow DOM
 *
 * Subclasses may call:
 *   - this.rebind(newTargetElementId)  — on SPA re-render of the proxied element
 *   - this.enableFocusTrap()           — when adapter hosts a modal/dialog
 *   - this.disableFocusTrap()          — when modal closes
 *   - this.flagCrossAriaRisk(detail)   — when cross-shadow aria-* refs are needed
 *
 * Implements AccessibilityAdapter (ADR-009 contract).
 */
export class AuaElement extends HTMLElement {
    constructor() {
        super(...arguments);
        _AuaElement_instances.add(this);
        this.targetElementId = "";
        this.semanticIntent = "";
        this.adaptationConfig = {
            skillId: "",
            mountPoint: "adjacent",
            zIndexStrategy: "isolated-stacking-context",
        };
        _AuaElement_shadowRoot.set(this, null);
        _AuaElement_cleanupFocusTrap.set(this, null);
        _AuaElement_previouslyFocused.set(this, null);
        _AuaElement_mutationObserver.set(this, null);
    }
    connectedCallback() {
        if (!this.targetElementId) {
            console.warn("[AUA] targetElementId not set — adapter not mounted.", this);
            return;
        }
        const target = document.getElementById(this.targetElementId);
        if (!target) {
            console.warn(`[AUA] targetElementId "${this.targetElementId}" not found — adapter not mounted.`);
            return;
        }
        // Enforce the ADR-009 rule: every subclass must set role and name before first paint.
        if (!this.accessibleRole || !this.accessibleName) {
            throw new Error(`[AUA] ${this.tagName}: accessibleRole and accessibleName must be non-empty before mount.`);
        }
        __classPrivateFieldSet(this, _AuaElement_previouslyFocused, document.activeElement, "f");
        if (!__classPrivateFieldGet(this, _AuaElement_shadowRoot, "f")) {
            __classPrivateFieldSet(this, _AuaElement_shadowRoot, this.attachShadow({ mode: "closed" }), "f");
            applyBaseStyles(__classPrivateFieldGet(this, _AuaElement_shadowRoot, "f"));
        }
        else {
            __classPrivateFieldGet(this, _AuaElement_instances, "m", _AuaElement_clearShadowContent).call(this);
        }
        this.render(__classPrivateFieldGet(this, _AuaElement_shadowRoot, "f"));
        emitLifecycle(this, "aua:mount", __classPrivateFieldGet(this, _AuaElement_instances, "m", _AuaElement_detail).call(this));
    }
    disconnectedCallback() {
        __classPrivateFieldGet(this, _AuaElement_cleanupFocusTrap, "f")?.call(this);
        __classPrivateFieldSet(this, _AuaElement_cleanupFocusTrap, null, "f");
        restoreFocus(__classPrivateFieldGet(this, _AuaElement_previouslyFocused, "f"));
        __classPrivateFieldSet(this, _AuaElement_previouslyFocused, null, "f");
        __classPrivateFieldGet(this, _AuaElement_mutationObserver, "f")?.disconnect();
        __classPrivateFieldSet(this, _AuaElement_mutationObserver, null, "f");
        __classPrivateFieldGet(this, _AuaElement_instances, "m", _AuaElement_clearShadowContent).call(this);
        emitLifecycle(this, "aua:unmount", __classPrivateFieldGet(this, _AuaElement_instances, "m", _AuaElement_detail).call(this));
    }
    /**
     * Call when the host SPA re-renders the proxied element (same logical element,
     * new DOM node). Updates targetElementId, re-renders, emits aua:rebind.
     */
    rebind(newTargetElementId) {
        this.targetElementId = newTargetElementId;
        const target = document.getElementById(newTargetElementId);
        if (!target) {
            console.warn(`[AUA] rebind: targetElementId "${newTargetElementId}" not found — skipping render.`);
        }
        else if (__classPrivateFieldGet(this, _AuaElement_shadowRoot, "f")) {
            __classPrivateFieldGet(this, _AuaElement_instances, "m", _AuaElement_clearShadowContent).call(this);
            this.render(__classPrivateFieldGet(this, _AuaElement_shadowRoot, "f"));
        }
        emitLifecycle(this, "aua:rebind", __classPrivateFieldGet(this, _AuaElement_instances, "m", _AuaElement_detail).call(this));
    }
    /** Activate focus trap inside this adapter's Shadow DOM (use for modal/dialog adapters). */
    enableFocusTrap() {
        if (!__classPrivateFieldGet(this, _AuaElement_shadowRoot, "f"))
            return;
        __classPrivateFieldGet(this, _AuaElement_cleanupFocusTrap, "f")?.call(this);
        __classPrivateFieldSet(this, _AuaElement_cleanupFocusTrap, trapFocus(__classPrivateFieldGet(this, _AuaElement_shadowRoot, "f")), "f");
    }
    /** Deactivate focus trap. */
    disableFocusTrap() {
        __classPrivateFieldGet(this, _AuaElement_cleanupFocusTrap, "f")?.call(this);
        __classPrivateFieldSet(this, _AuaElement_cleanupFocusTrap, null, "f");
    }
    /**
     * ADR-009 open question: cross-shadow-boundary aria-describedby / aria-labelledby
     * reliability varies by browser. NEEDS VERIFICATION per browser at implementation time.
     * Call this method rather than silently dropping the ARIA relationship.
     */
    flagCrossAriaRisk(detail) {
        console.warn(`[AUA] Cross-shadow ARIA boundary risk detected (ADR-009 open question). ` +
            `Verify per-browser before relying on this relationship. Detail: ${detail}`, this);
    }
}
_AuaElement_shadowRoot = new WeakMap(), _AuaElement_cleanupFocusTrap = new WeakMap(), _AuaElement_previouslyFocused = new WeakMap(), _AuaElement_mutationObserver = new WeakMap(), _AuaElement_instances = new WeakSet(), _AuaElement_clearShadowContent = function _AuaElement_clearShadowContent() {
    if (!__classPrivateFieldGet(this, _AuaElement_shadowRoot, "f"))
        return;
    // Remove only non-style children so the base stylesheet is preserved.
    const toRemove = [];
    __classPrivateFieldGet(this, _AuaElement_shadowRoot, "f").childNodes.forEach((node) => {
        if (!(node instanceof HTMLStyleElement))
            toRemove.push(node);
    });
    toRemove.forEach((n) => n.parentNode?.removeChild(n));
}, _AuaElement_detail = function _AuaElement_detail() {
    return {
        targetElementId: this.targetElementId,
        elementTag: this.tagName.toLowerCase(),
        timestamp: Date.now(),
    };
};
//# sourceMappingURL=AuaElement.js.map