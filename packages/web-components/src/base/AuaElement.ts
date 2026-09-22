import type { AccessibilityAdapter, AdaptationConfig, LifecycleEventDetail } from "../types.js";
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

function applyBaseStyles(shadow: ShadowRoot): void {
  if (
    typeof CSSStyleSheet !== "undefined" &&
    "replaceSync" in CSSStyleSheet.prototype
  ) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(BASE_CSS);
    shadow.adoptedStyleSheets = [sheet];
  } else {
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
export abstract class AuaElement extends HTMLElement implements AccessibilityAdapter {
  targetElementId = "";
  semanticIntent = "";
  adaptationConfig: AdaptationConfig = {
    skillId: "",
    mountPoint: "adjacent",
    zIndexStrategy: "isolated-stacking-context",
  };

  #shadowRoot: ShadowRoot | null = null;
  #cleanupFocusTrap: (() => void) | null = null;
  #previouslyFocused: Element | null = null;
  #mutationObserver: MutationObserver | null = null;

  /** ARIA role the shadow-hosted control presents to assistive technology. */
  abstract get accessibleRole(): string;

  /** Accessible name of the shadow-hosted control. Must be non-empty before mount. */
  abstract get accessibleName(): string;

  /** Populate the Shadow DOM. Called on mount and after each rebind. */
  protected abstract render(shadowRoot: ShadowRoot): void;

  connectedCallback(): void {
    if (!this.targetElementId) {
      console.warn("[AUA] targetElementId not set — adapter not mounted.", this);
      return;
    }

    const target = document.getElementById(this.targetElementId);
    if (!target) {
      console.warn(
        `[AUA] targetElementId "${this.targetElementId}" not found — adapter not mounted.`
      );
      return;
    }

    // Enforce the ADR-009 rule: every subclass must set role and name before first paint.
    if (!this.accessibleRole || !this.accessibleName) {
      throw new Error(
        `[AUA] ${this.tagName}: accessibleRole and accessibleName must be non-empty before mount.`
      );
    }

    this.#previouslyFocused = document.activeElement;

    if (!this.#shadowRoot) {
      this.#shadowRoot = this.attachShadow({ mode: "closed" });
      applyBaseStyles(this.#shadowRoot);
    } else {
      this.#clearShadowContent();
    }

    this.render(this.#shadowRoot);

    emitLifecycle(this, "aua:mount", this.#detail());
  }

  disconnectedCallback(): void {
    this.#cleanupFocusTrap?.();
    this.#cleanupFocusTrap = null;

    restoreFocus(this.#previouslyFocused);
    this.#previouslyFocused = null;

    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;

    this.#clearShadowContent();

    emitLifecycle(this, "aua:unmount", this.#detail());
  }

  /**
   * Call when the host SPA re-renders the proxied element (same logical element,
   * new DOM node). Updates targetElementId, re-renders, emits aua:rebind.
   */
  rebind(newTargetElementId: string): void {
    this.targetElementId = newTargetElementId;

    const target = document.getElementById(newTargetElementId);
    if (!target) {
      console.warn(
        `[AUA] rebind: targetElementId "${newTargetElementId}" not found — skipping render.`
      );
    } else if (this.#shadowRoot) {
      this.#clearShadowContent();
      this.render(this.#shadowRoot);
    }

    emitLifecycle(this, "aua:rebind", this.#detail());
  }

  /** Activate focus trap inside this adapter's Shadow DOM (use for modal/dialog adapters). */
  protected enableFocusTrap(): void {
    if (!this.#shadowRoot) return;
    this.#cleanupFocusTrap?.();
    this.#cleanupFocusTrap = trapFocus(this.#shadowRoot);
  }

  /** Deactivate focus trap. */
  protected disableFocusTrap(): void {
    this.#cleanupFocusTrap?.();
    this.#cleanupFocusTrap = null;
  }

  /**
   * ADR-009 open question: cross-shadow-boundary aria-describedby / aria-labelledby
   * reliability varies by browser. NEEDS VERIFICATION per browser at implementation time.
   * Call this method rather than silently dropping the ARIA relationship.
   */
  protected flagCrossAriaRisk(detail: string): void {
    console.warn(
      `[AUA] Cross-shadow ARIA boundary risk detected (ADR-009 open question). ` +
        `Verify per-browser before relying on this relationship. Detail: ${detail}`,
      this
    );
  }

  #clearShadowContent(): void {
    if (!this.#shadowRoot) return;
    // Remove only non-style children so the base stylesheet is preserved.
    const toRemove: ChildNode[] = [];
    this.#shadowRoot.childNodes.forEach((node) => {
      if (!(node instanceof HTMLStyleElement)) toRemove.push(node);
    });
    toRemove.forEach((n) => n.parentNode?.removeChild(n));
  }

  #detail(): LifecycleEventDetail {
    return {
      targetElementId: this.targetElementId,
      elementTag: this.tagName.toLowerCase(),
      timestamp: Date.now(),
    };
  }
}
