import { AuaElement } from "../base/AuaElement.js";

type Politeness = "polite" | "assertive";

function toPoliteness(value: string | null): Politeness {
  return value === "assertive" ? "assertive" : "polite";
}

// Visually hides the live region while keeping it in the accessibility tree —
// the standard "screen-reader only" pattern for a live-announcement channel
// that has no visible UI of its own.
const LIVE_REGION_CSS = `
  :host {
    display: block;
  }
  div {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;

/**
 * Accessible live-region adapter (WP-011).
 *
 * Implements the `announce` skill (packages/skill-sdk/registry/announce.json): injects an
 * ARIA live region (per ADR-009, mounted adjacent/overlay to its target, never replacing it)
 * that screen readers pick up automatically when its text content changes.
 */
export class A11yLiveRegion extends AuaElement {
  static get observedAttributes(): string[] {
    return ["politeness", "atomic"];
  }

  #shadowRoot: ShadowRoot | null = null;
  #divEl: HTMLDivElement | null = null;
  #clearTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

  get accessibleRole(): string {
    return "status";
  }

  get accessibleName(): string {
    // A live region's accessible name is not user-facing content — its value
    // comes from the announced text, not a label. AuaElement still requires a
    // non-empty name before mount, so a short static description stands in.
    return "Announcements";
  }

  protected render(shadowRoot: ShadowRoot): void {
    this.#shadowRoot = shadowRoot;

    const style = document.createElement("style");
    style.textContent = LIVE_REGION_CSS;

    const div = document.createElement("div");
    div.setAttribute("role", "status");
    div.setAttribute("aria-live", toPoliteness(this.getAttribute("politeness")));
    div.setAttribute("aria-atomic", this.hasAttribute("atomic") ? "true" : "false");

    shadowRoot.appendChild(style);
    shadowRoot.appendChild(div);

    this.#divEl = div;
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    if (!this.#divEl) return;

    // Politeness/atomic can change live without disturbing the current
    // announcement — only patch the relevant ARIA attribute, never clear text.
    if (name === "politeness") {
      this.#divEl.setAttribute("aria-live", toPoliteness(newValue));
    } else if (name === "atomic") {
      this.#divEl.setAttribute("aria-atomic", this.hasAttribute("atomic") ? "true" : "false");
    }
  }

  /**
   * Announce `message` to assistive technology by writing it into the live region.
   * If `clearAfterMs` is given, the text is cleared back to "" after that delay —
   * any previously scheduled clear is cancelled first so overlapping announce()
   * calls never wipe out a message that hasn't had time to be read yet.
   */
  announce(message: string, clearAfterMs?: number): void {
    if (this.#clearTimeoutHandle !== null) {
      clearTimeout(this.#clearTimeoutHandle);
      this.#clearTimeoutHandle = null;
    }

    if (this.#divEl) {
      this.#divEl.textContent = message;
    }

    if (typeof clearAfterMs === "number") {
      this.#clearTimeoutHandle = setTimeout(() => {
        if (this.#divEl) this.#divEl.textContent = "";
        this.#clearTimeoutHandle = null;
      }, clearAfterMs);
    }
  }
}

if (!customElements.get("a11y-live-region")) {
  customElements.define("a11y-live-region", A11yLiveRegion);
}
