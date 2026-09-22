import { AuaElement } from "../base/AuaElement.js";

// Field types this proxy knows how to present as a native <input type="…">.
// Anything outside this set (or omitted) falls back to "text".
const FIELD_TYPES = ["text", "number", "email", "search", "tel", "date"] as const;
type FieldType = (typeof FIELD_TYPES)[number];

function toFieldType(value: string | null): FieldType {
  return (FIELD_TYPES as readonly string[]).includes(value ?? "")
    ? (value as FieldType)
    : "text";
}

const FIELD_PROXY_CSS = `
  :host {
    display: inline-block;
  }
  label {
    display: block;
    font: inherit;
    margin-bottom: 0.25rem;
  }
  input {
    box-sizing: border-box;
    font: inherit;
    padding: 0.375rem 0.5rem;
    border-radius: 4px;
    background: var(--aua-field-bg, #ffffff);
    color: var(--aua-field-fg, #1a1a1a);
    border: 1px solid var(--aua-field-border, #767676);
  }
  input:focus-visible {
    outline: 2px solid var(--aua-field-focus-ring, #005fcc);
    outline-offset: 1px;
  }
  input[aria-invalid="true"] {
    border-color: var(--aua-field-border, #c0272d);
  }
  [part="error"] {
    display: block;
    min-height: 1em;
    margin-top: 0.25rem;
    color: #c0272d;
    font-size: 0.85em;
  }
`;

/**
 * Accessible field proxy adapter (WP-011).
 *
 * Implements the `inject_field_proxy` skill (packages/skill-sdk/registry/inject_field_proxy.json):
 * mounts adjacent/overlay to the original field (per ADR-009) and offers an alternative,
 * fully-labelled keyboard/switch-accessible surface. Bidirectionally syncs its `value`
 * with the original control via the `a11y-value-change` CustomEvent (the Safe Interaction
 * Strategy sync channel — ADR-009/ADR-010) and via the observed `value` attribute for
 * updates flowing the other way (original control → proxy).
 */
export class A11yFieldProxy extends AuaElement {
  static get observedAttributes(): string[] {
    return ["label", "value", "field-type", "required", "error-message"];
  }

  #shadowRoot: ShadowRoot | null = null;
  #labelEl: HTMLLabelElement | null = null;
  #inputEl: HTMLInputElement | null = null;
  #errorEl: HTMLSpanElement | null = null;

  get accessibleRole(): string {
    return "textbox";
  }

  get accessibleName(): string {
    const label = this.getAttribute("label");
    if (label && label.trim().length > 0) {
      return label;
    }
    // AuaElement requires a non-empty accessible name before mount, but an empty
    // `label` attribute is a real authoring problem upstream — surface it loudly
    // rather than silently mounting an unlabelled-looking proxy.
    console.warn(
      '[A11yFieldProxy] Empty "label" attribute — falling back to placeholder accessible name "Field". ' +
        "This is an authoring error: provide a real label.",
      this
    );
    return "Field";
  }

  protected render(shadowRoot: ShadowRoot): void {
    this.#shadowRoot = shadowRoot;

    const style = document.createElement("style");
    style.textContent = FIELD_PROXY_CSS;

    const label = document.createElement("label");
    label.setAttribute("part", "label");
    label.id = "proxy-label";
    label.textContent = this.accessibleName;

    const input = document.createElement("input");
    input.setAttribute("part", "input");
    input.setAttribute("aria-labelledby", "proxy-label");
    input.type = toFieldType(this.getAttribute("field-type"));
    input.value = this.getAttribute("value") ?? "";
    input.required = this.hasAttribute("required");
    input.addEventListener("input", () => {
      this.dispatchEvent(
        new CustomEvent("a11y-value-change", {
          detail: { value: input.value, targetElementId: this.targetElementId },
          bubbles: true,
          composed: true,
        })
      );
    });

    const errorMessage = this.getAttribute("error-message") ?? "";
    const errorEl = document.createElement("span");
    errorEl.setAttribute("part", "error");
    errorEl.setAttribute("role", "alert");
    errorEl.setAttribute("aria-live", "assertive");
    errorEl.textContent = errorMessage;

    if (errorMessage) {
      input.setAttribute("aria-invalid", "true");
    } else {
      input.removeAttribute("aria-invalid");
    }

    shadowRoot.appendChild(style);
    shadowRoot.appendChild(label);
    shadowRoot.appendChild(input);
    shadowRoot.appendChild(errorEl);

    this.#labelEl = label;
    this.#inputEl = input;
    this.#errorEl = errorEl;
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    // Not mounted yet (attribute set before connectedCallback ran) — render()
    // reads current attribute values directly, nothing to patch here.
    if (!this.#shadowRoot) return;

    switch (name) {
      case "value": {
        // External sync (original control → proxy): update the input's value
        // directly and do NOT dispatch a11y-value-change, or we'd create an
        // infinite sync loop back to the original control.
        if (this.#inputEl && this.#inputEl.value !== (newValue ?? "")) {
          this.#inputEl.value = newValue ?? "";
        }
        break;
      }
      case "field-type": {
        if (this.#inputEl) this.#inputEl.type = toFieldType(newValue);
        break;
      }
      case "required": {
        if (this.#inputEl) this.#inputEl.required = this.hasAttribute("required");
        break;
      }
      case "error-message": {
        const message = newValue ?? "";
        if (this.#errorEl) this.#errorEl.textContent = message;
        if (this.#inputEl) {
          if (message) {
            this.#inputEl.setAttribute("aria-invalid", "true");
          } else {
            this.#inputEl.removeAttribute("aria-invalid");
          }
        }
        break;
      }
      case "label": {
        if (this.#labelEl) this.#labelEl.textContent = this.accessibleName;
        break;
      }
      default:
        break;
    }
  }
}

if (!customElements.get("a11y-field-proxy")) {
  customElements.define("a11y-field-proxy", A11yFieldProxy);
}
