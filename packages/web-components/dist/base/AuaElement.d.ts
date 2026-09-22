import type { AccessibilityAdapter, AdaptationConfig } from "../types.js";
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
export declare abstract class AuaElement extends HTMLElement implements AccessibilityAdapter {
    #private;
    targetElementId: string;
    semanticIntent: string;
    adaptationConfig: AdaptationConfig;
    /** ARIA role the shadow-hosted control presents to assistive technology. */
    abstract get accessibleRole(): string;
    /** Accessible name of the shadow-hosted control. Must be non-empty before mount. */
    abstract get accessibleName(): string;
    /** Populate the Shadow DOM. Called on mount and after each rebind. */
    protected abstract render(shadowRoot: ShadowRoot): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    /**
     * Call when the host SPA re-renders the proxied element (same logical element,
     * new DOM node). Updates targetElementId, re-renders, emits aua:rebind.
     */
    rebind(newTargetElementId: string): void;
    /** Activate focus trap inside this adapter's Shadow DOM (use for modal/dialog adapters). */
    protected enableFocusTrap(): void;
    /** Deactivate focus trap. */
    protected disableFocusTrap(): void;
    /**
     * ADR-009 open question: cross-shadow-boundary aria-describedby / aria-labelledby
     * reliability varies by browser. NEEDS VERIFICATION per browser at implementation time.
     * Call this method rather than silently dropping the ARIA relationship.
     */
    protected flagCrossAriaRisk(detail: string): void;
}
//# sourceMappingURL=AuaElement.d.ts.map