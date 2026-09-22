// ../../packages/web-components/dist/base/lifecycle-emitter.js
function emitLifecycle(host, type, detail) {
  host.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
}

// ../../packages/web-components/dist/base/focus-manager.js
var FOCUSABLE_SELECTOR = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
function getFocusable(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR));
}
function trapFocus(root) {
  function onKeyDown(event) {
    const e = event;
    if (e.key !== "Tab")
      return;
    const focusable = getFocusable(root);
    if (focusable.length === 0)
      return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last)
      return;
    const active = root.activeElement;
    if (e.shiftKey) {
      if (active === first || active === null) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last || active === null) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  root.addEventListener("keydown", onKeyDown);
  return () => root.removeEventListener("keydown", onKeyDown);
}
function restoreFocus(target) {
  if (target instanceof HTMLElement && target.isConnected) {
    target.focus();
  }
}

// ../../packages/web-components/dist/base/AuaElement.js
var __classPrivateFieldSet = function(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet = function(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _AuaElement_instances;
var _AuaElement_shadowRoot;
var _AuaElement_cleanupFocusTrap;
var _AuaElement_previouslyFocused;
var _AuaElement_mutationObserver;
var _AuaElement_lastConnectedParent;
var _AuaElement_clearShadowContent;
var _AuaElement_detail;
var BASE_CSS = `
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
  if (typeof CSSStyleSheet !== "undefined" && "replaceSync" in CSSStyleSheet.prototype) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(BASE_CSS);
    shadow.adoptedStyleSheets = [sheet];
  } else {
    const style = document.createElement("style");
    style.textContent = BASE_CSS;
    shadow.appendChild(style);
  }
}
var AuaElement = class extends HTMLElement {
  constructor() {
    super(...arguments);
    _AuaElement_instances.add(this);
    this.targetElementId = "";
    this.semanticIntent = "";
    this.adaptationConfig = {
      skillId: "",
      mountPoint: "adjacent",
      zIndexStrategy: "isolated-stacking-context"
    };
    _AuaElement_shadowRoot.set(this, null);
    _AuaElement_cleanupFocusTrap.set(this, null);
    _AuaElement_previouslyFocused.set(this, null);
    _AuaElement_mutationObserver.set(this, null);
    _AuaElement_lastConnectedParent.set(this, null);
  }
  connectedCallback() {
    __classPrivateFieldSet(this, _AuaElement_lastConnectedParent, this.parentNode, "f");
    if (!this.targetElementId) {
      console.warn("[AUA] targetElementId not set \u2014 adapter not mounted.", this);
      return;
    }
    const target = document.getElementById(this.targetElementId);
    if (!target) {
      console.warn(`[AUA] targetElementId "${this.targetElementId}" not found \u2014 adapter not mounted.`);
      return;
    }
    if (!this.accessibleRole || !this.accessibleName) {
      throw new Error(`[AUA] ${this.tagName}: accessibleRole and accessibleName must be non-empty before mount.`);
    }
    __classPrivateFieldSet(this, _AuaElement_previouslyFocused, document.activeElement, "f");
    if (!__classPrivateFieldGet(this, _AuaElement_shadowRoot, "f")) {
      __classPrivateFieldSet(this, _AuaElement_shadowRoot, this.attachShadow({ mode: "closed" }), "f");
      applyBaseStyles(__classPrivateFieldGet(this, _AuaElement_shadowRoot, "f"));
    } else {
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
    emitLifecycle(__classPrivateFieldGet(this, _AuaElement_lastConnectedParent, "f") ?? this, "aua:unmount", __classPrivateFieldGet(this, _AuaElement_instances, "m", _AuaElement_detail).call(this));
    __classPrivateFieldSet(this, _AuaElement_lastConnectedParent, null, "f");
  }
  /**
   * Call when the host SPA re-renders the proxied element (same logical element,
   * new DOM node). Updates targetElementId, re-renders, emits aua:rebind.
   */
  rebind(newTargetElementId) {
    this.targetElementId = newTargetElementId;
    const target = document.getElementById(newTargetElementId);
    if (!target) {
      console.warn(`[AUA] rebind: targetElementId "${newTargetElementId}" not found \u2014 skipping render.`);
    } else if (__classPrivateFieldGet(this, _AuaElement_shadowRoot, "f")) {
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
    console.warn(`[AUA] Cross-shadow ARIA boundary risk detected (ADR-009 open question). Verify per-browser before relying on this relationship. Detail: ${detail}`, this);
  }
};
_AuaElement_shadowRoot = /* @__PURE__ */ new WeakMap(), _AuaElement_cleanupFocusTrap = /* @__PURE__ */ new WeakMap(), _AuaElement_previouslyFocused = /* @__PURE__ */ new WeakMap(), _AuaElement_mutationObserver = /* @__PURE__ */ new WeakMap(), _AuaElement_lastConnectedParent = /* @__PURE__ */ new WeakMap(), _AuaElement_instances = /* @__PURE__ */ new WeakSet(), _AuaElement_clearShadowContent = function _AuaElement_clearShadowContent2() {
  if (!__classPrivateFieldGet(this, _AuaElement_shadowRoot, "f"))
    return;
  const toRemove = [];
  __classPrivateFieldGet(this, _AuaElement_shadowRoot, "f").childNodes.forEach((node) => {
    if (!(node instanceof HTMLStyleElement))
      toRemove.push(node);
  });
  toRemove.forEach((n) => n.parentNode?.removeChild(n));
}, _AuaElement_detail = function _AuaElement_detail2() {
  return {
    targetElementId: this.targetElementId,
    elementTag: this.tagName.toLowerCase(),
    timestamp: Date.now()
  };
};

// ../../packages/web-components/dist/adapters/a11y-field-proxy.js
var __classPrivateFieldSet2 = function(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet2 = function(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _A11yFieldProxy_shadowRoot;
var _A11yFieldProxy_labelEl;
var _A11yFieldProxy_inputEl;
var _A11yFieldProxy_errorEl;
var FIELD_TYPES = ["text", "number", "email", "search", "tel", "date"];
function toFieldType(value) {
  return FIELD_TYPES.includes(value ?? "") ? value : "text";
}
var FIELD_PROXY_CSS = `
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
var A11yFieldProxy = class extends AuaElement {
  constructor() {
    super(...arguments);
    _A11yFieldProxy_shadowRoot.set(this, null);
    _A11yFieldProxy_labelEl.set(this, null);
    _A11yFieldProxy_inputEl.set(this, null);
    _A11yFieldProxy_errorEl.set(this, null);
  }
  static get observedAttributes() {
    return ["label", "value", "field-type", "required", "error-message"];
  }
  get accessibleRole() {
    return "textbox";
  }
  get accessibleName() {
    const label = this.getAttribute("label");
    if (label && label.trim().length > 0) {
      return label;
    }
    console.warn('[A11yFieldProxy] Empty "label" attribute \u2014 falling back to placeholder accessible name "Field". This is an authoring error: provide a real label.', this);
    return "Field";
  }
  render(shadowRoot) {
    __classPrivateFieldSet2(this, _A11yFieldProxy_shadowRoot, shadowRoot, "f");
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
      this.dispatchEvent(new CustomEvent("a11y-value-change", {
        detail: { value: input.value, targetElementId: this.targetElementId },
        bubbles: true,
        composed: true
      }));
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
    __classPrivateFieldSet2(this, _A11yFieldProxy_labelEl, label, "f");
    __classPrivateFieldSet2(this, _A11yFieldProxy_inputEl, input, "f");
    __classPrivateFieldSet2(this, _A11yFieldProxy_errorEl, errorEl, "f");
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue)
      return;
    if (!__classPrivateFieldGet2(this, _A11yFieldProxy_shadowRoot, "f"))
      return;
    switch (name) {
      case "value": {
        if (__classPrivateFieldGet2(this, _A11yFieldProxy_inputEl, "f") && __classPrivateFieldGet2(this, _A11yFieldProxy_inputEl, "f").value !== (newValue ?? "")) {
          __classPrivateFieldGet2(this, _A11yFieldProxy_inputEl, "f").value = newValue ?? "";
        }
        break;
      }
      case "field-type": {
        if (__classPrivateFieldGet2(this, _A11yFieldProxy_inputEl, "f"))
          __classPrivateFieldGet2(this, _A11yFieldProxy_inputEl, "f").type = toFieldType(newValue);
        break;
      }
      case "required": {
        if (__classPrivateFieldGet2(this, _A11yFieldProxy_inputEl, "f"))
          __classPrivateFieldGet2(this, _A11yFieldProxy_inputEl, "f").required = this.hasAttribute("required");
        break;
      }
      case "error-message": {
        const message = newValue ?? "";
        if (__classPrivateFieldGet2(this, _A11yFieldProxy_errorEl, "f"))
          __classPrivateFieldGet2(this, _A11yFieldProxy_errorEl, "f").textContent = message;
        if (__classPrivateFieldGet2(this, _A11yFieldProxy_inputEl, "f")) {
          if (message) {
            __classPrivateFieldGet2(this, _A11yFieldProxy_inputEl, "f").setAttribute("aria-invalid", "true");
          } else {
            __classPrivateFieldGet2(this, _A11yFieldProxy_inputEl, "f").removeAttribute("aria-invalid");
          }
        }
        break;
      }
      case "label": {
        if (__classPrivateFieldGet2(this, _A11yFieldProxy_labelEl, "f"))
          __classPrivateFieldGet2(this, _A11yFieldProxy_labelEl, "f").textContent = this.accessibleName;
        break;
      }
      default:
        break;
    }
  }
};
_A11yFieldProxy_shadowRoot = /* @__PURE__ */ new WeakMap(), _A11yFieldProxy_labelEl = /* @__PURE__ */ new WeakMap(), _A11yFieldProxy_inputEl = /* @__PURE__ */ new WeakMap(), _A11yFieldProxy_errorEl = /* @__PURE__ */ new WeakMap();
if (!customElements.get("a11y-field-proxy")) {
  customElements.define("a11y-field-proxy", A11yFieldProxy);
}

// ../../packages/web-components/dist/adapters/a11y-live-region.js
var __classPrivateFieldSet3 = function(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet3 = function(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _A11yLiveRegion_shadowRoot;
var _A11yLiveRegion_divEl;
var _A11yLiveRegion_clearTimeoutHandle;
function toPoliteness(value) {
  return value === "assertive" ? "assertive" : "polite";
}
var LIVE_REGION_CSS = `
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
var A11yLiveRegion = class extends AuaElement {
  constructor() {
    super(...arguments);
    _A11yLiveRegion_shadowRoot.set(this, null);
    _A11yLiveRegion_divEl.set(this, null);
    _A11yLiveRegion_clearTimeoutHandle.set(this, null);
  }
  static get observedAttributes() {
    return ["politeness", "atomic"];
  }
  get accessibleRole() {
    return "status";
  }
  get accessibleName() {
    return "Announcements";
  }
  render(shadowRoot) {
    __classPrivateFieldSet3(this, _A11yLiveRegion_shadowRoot, shadowRoot, "f");
    const style = document.createElement("style");
    style.textContent = LIVE_REGION_CSS;
    const div = document.createElement("div");
    div.setAttribute("role", "status");
    div.setAttribute("aria-live", toPoliteness(this.getAttribute("politeness")));
    div.setAttribute("aria-atomic", this.hasAttribute("atomic") ? "true" : "false");
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(div);
    __classPrivateFieldSet3(this, _A11yLiveRegion_divEl, div, "f");
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue)
      return;
    if (!__classPrivateFieldGet3(this, _A11yLiveRegion_divEl, "f"))
      return;
    if (name === "politeness") {
      __classPrivateFieldGet3(this, _A11yLiveRegion_divEl, "f").setAttribute("aria-live", toPoliteness(newValue));
    } else if (name === "atomic") {
      __classPrivateFieldGet3(this, _A11yLiveRegion_divEl, "f").setAttribute("aria-atomic", this.hasAttribute("atomic") ? "true" : "false");
    }
  }
  /**
   * Announce `message` to assistive technology by writing it into the live region.
   * If `clearAfterMs` is given, the text is cleared back to "" after that delay —
   * any previously scheduled clear is cancelled first so overlapping announce()
   * calls never wipe out a message that hasn't had time to be read yet.
   */
  announce(message, clearAfterMs) {
    if (__classPrivateFieldGet3(this, _A11yLiveRegion_clearTimeoutHandle, "f") !== null) {
      clearTimeout(__classPrivateFieldGet3(this, _A11yLiveRegion_clearTimeoutHandle, "f"));
      __classPrivateFieldSet3(this, _A11yLiveRegion_clearTimeoutHandle, null, "f");
    }
    if (__classPrivateFieldGet3(this, _A11yLiveRegion_divEl, "f")) {
      __classPrivateFieldGet3(this, _A11yLiveRegion_divEl, "f").textContent = message;
    }
    if (typeof clearAfterMs === "number") {
      __classPrivateFieldSet3(this, _A11yLiveRegion_clearTimeoutHandle, setTimeout(() => {
        if (__classPrivateFieldGet3(this, _A11yLiveRegion_divEl, "f"))
          __classPrivateFieldGet3(this, _A11yLiveRegion_divEl, "f").textContent = "";
        __classPrivateFieldSet3(this, _A11yLiveRegion_clearTimeoutHandle, null, "f");
      }, clearAfterMs), "f");
    }
  }
};
_A11yLiveRegion_shadowRoot = /* @__PURE__ */ new WeakMap(), _A11yLiveRegion_divEl = /* @__PURE__ */ new WeakMap(), _A11yLiveRegion_clearTimeoutHandle = /* @__PURE__ */ new WeakMap();
if (!customElements.get("a11y-live-region")) {
  customElements.define("a11y-live-region", A11yLiveRegion);
}

// ../../packages/contracts/dist/semantic-page-model.js
var SEMANTIC_MODEL_VERSION = "1.0.0";

// src/semantic-model/identity.ts
var LANDMARK_TAGS = /* @__PURE__ */ new Set([
  "nav",
  "main",
  "header",
  "footer",
  "aside",
  "form",
  "dialog",
  "section",
  "article"
]);
var LANDMARK_ROLES = /* @__PURE__ */ new Set([
  "banner",
  "navigation",
  "main",
  "complementary",
  "contentinfo",
  "region",
  "form",
  "dialog",
  "search"
]);
function computeStructuralPath(el) {
  let node = el.parentElement;
  while (node) {
    const id = node.getAttribute("id");
    if (id && id.trim()) return `#${id.trim()}`;
    const explicitRole = node.getAttribute("role");
    if (explicitRole && LANDMARK_ROLES.has(explicitRole.toLowerCase())) {
      return `role:${explicitRole.toLowerCase()}`;
    }
    const tag = node.tagName.toLowerCase();
    if (LANDMARK_TAGS.has(tag)) return `tag:${tag}`;
    node = node.parentElement;
  }
  return "root:body";
}
function fnv1a(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function makeElementId(el, path, role, name, disambiguator) {
  const tag = el.tagName ? el.tagName.toLowerCase() : "unknown";
  const composite = [path, role, tag, name.trim().toLowerCase(), String(disambiguator)].join(
    ""
  );
  return `aua-${fnv1a(composite)}`;
}

// src/semantic-model/role-inference.ts
var BUTTON_INPUT_TYPES = /* @__PURE__ */ new Set(["submit", "button", "reset", "image"]);
var HEADING_TAGS = /* @__PURE__ */ new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
function inferRole(el) {
  const explicit = el.getAttribute("role");
  if (explicit && explicit.trim()) return explicit.trim().toLowerCase();
  const tag = el.tagName.toLowerCase();
  if (tag === "button") return "button";
  if (tag === "input" && BUTTON_INPUT_TYPES.has((el.getAttribute("type") || "").toLowerCase())) {
    return "button";
  }
  if (tag === "a" && el.hasAttribute("href")) return "link";
  if (tag === "input" || tag === "textarea" || tag === "select") return "input";
  if (tag === "nav") return "navigation";
  if (tag === "form") return "form";
  if (tag === "dialog") return "dialog";
  if (HEADING_TAGS.has(tag)) return "heading";
  if (tag === "main") return "main";
  if (tag === "header") return "banner";
  if (tag === "footer") return "contentinfo";
  if (tag === "aside") return "complementary";
  if (tag === "article") return "article";
  const ariaLive = (el.getAttribute("aria-live") || "").toLowerCase();
  if (ariaLive === "polite" || ariaLive === "assertive") {
    const text = (el.textContent || "").trim();
    if (text) return "error";
  }
  if (tag === "section" && (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))) {
    return "region";
  }
  const hasText = (el.textContent || "").trim().length > 0;
  const hasElementChildren = el.children.length > 0;
  if (hasText && !hasElementChildren) return "text";
  return "unknown";
}
function resolveLabelElement(el) {
  const doc = el.ownerDocument;
  const id = el.getAttribute("id");
  if (id) {
    const labels = doc.getElementsByTagName("label");
    for (const label of Array.from(labels)) {
      if (label.getAttribute("for") === id) return label;
    }
  }
  return el.closest("label");
}
var FORM_FIELD_TAGS = /* @__PURE__ */ new Set(["input", "textarea"]);
var TEXT_FALLBACK_TAGS = /* @__PURE__ */ new Set(["button", "a"]);
var TEXT_FALLBACK_ROLES = /* @__PURE__ */ new Set(["button", "link"]);
function inferAccessibleName(el) {
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const doc = el.ownerDocument;
    const text = labelledBy.split(/\s+/).filter(Boolean).map((id) => doc.getElementById(id)?.textContent?.trim() ?? "").filter((s) => s.length > 0).join(" ");
    if (text) return text;
  }
  const label = resolveLabelElement(el);
  if (label) {
    const text = (label.textContent || "").trim();
    if (text) return text;
  }
  const tag = el.tagName.toLowerCase();
  if (FORM_FIELD_TAGS.has(tag)) {
    const placeholder = el.getAttribute("placeholder");
    if (placeholder && placeholder.trim()) return placeholder.trim();
  }
  const title = el.getAttribute("title");
  if (title && title.trim()) return title.trim();
  const role = (el.getAttribute("role") || "").toLowerCase();
  if (TEXT_FALLBACK_TAGS.has(tag) || TEXT_FALLBACK_ROLES.has(role)) {
    const text = (el.textContent || "").trim();
    if (text) return text;
  }
  return "";
}

// src/semantic-model/capability-inference.ts
var CLICKABLE_TAGS = /* @__PURE__ */ new Set(["button", "a", "input", "select", "textarea"]);
var INTERACTIVE_ROLES = /* @__PURE__ */ new Set([
  "button",
  "link",
  "menuitem",
  "tab",
  "checkbox",
  "radio",
  "switch",
  "option"
]);
function isNativelyFocusable(el) {
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "button" || tag === "select" || tag === "textarea") return true;
  if (tag === "a" && el.hasAttribute("href")) return true;
  const tabindex = el.getAttribute("tabindex");
  if (tabindex !== null) {
    const n = Number.parseInt(tabindex, 10);
    if (!Number.isNaN(n) && n >= 0) return true;
  }
  return false;
}
function isClickable(el) {
  const tag = el.tagName.toLowerCase();
  if (CLICKABLE_TAGS.has(tag)) return true;
  if (el.hasAttribute("onclick")) return true;
  const role = (el.getAttribute("role") || "").toLowerCase();
  return INTERACTIVE_ROLES.has(role);
}
function isDragLike(el) {
  if (el.getAttribute("draggable") === "true") return true;
  const className = typeof el.className === "string" ? el.className : "";
  if (/\b(drag|slider)\b/i.test(className)) return true;
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith("data-") && /drag|slider/i.test(`${attr.name} ${attr.value}`)) {
      return true;
    }
  }
  return false;
}
function hasHoverHint(el) {
  const className = typeof el.className === "string" ? el.className : "";
  if (/hover/i.test(className)) return true;
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith("data-") && /hover/i.test(attr.name)) return true;
  }
  return false;
}
function safeRect(el) {
  try {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  } catch {
    return { width: 0, height: 0 };
  }
}
function isHiddenByDefault(el) {
  const rect = safeRect(el);
  const view = el.ownerDocument?.defaultView;
  const style = view ? view.getComputedStyle(el) : null;
  const zeroBox = rect.width === 0 && rect.height === 0;
  const styledHidden = style ? style.display === "none" || style.visibility === "hidden" : false;
  return zeroBox || styledHidden;
}
function isHoverOnly(el) {
  return hasHoverHint(el) && !isNativelyFocusable(el) && isHiddenByDefault(el);
}
function hasSmallTarget(el) {
  const rect = safeRect(el);
  if (rect.width === 0 && rect.height === 0) return false;
  return rect.width < 24 || rect.height < 24;
}
function inferRequiredCapabilities(el) {
  const caps = /* @__PURE__ */ new Set();
  if (isClickable(el)) caps.add("pointer");
  if (isNativelyFocusable(el)) caps.add("keyboard");
  if (isDragLike(el)) {
    caps.add("pointer");
    caps.add("drag");
  }
  if (isHoverOnly(el)) {
    caps.add("pointer");
    caps.add("hover");
  }
  if (isClickable(el) && hasSmallTarget(el)) {
    caps.add("precision-targeting");
  }
  return Array.from(caps);
}

// src/semantic-model/sensitivity.ts
var SENSITIVE_AUTOCOMPLETE_TOKENS = ["cc-", "current-password", "new-password", "one-time-code"];
var SENSITIVE_NAME_PATTERN = /\b(password|ssn|card[-_ ]?number|cvv|cvc|pin)\b/i;
function isSensitive(el) {
  const type = (el.getAttribute("type") || "").toLowerCase();
  const autocomplete = (el.getAttribute("autocomplete") || "").toLowerCase();
  const name = (el.getAttribute("name") || "").toLowerCase();
  const id = (el.getAttribute("id") || "").toLowerCase();
  if (type === "password") return true;
  if (SENSITIVE_AUTOCOMPLETE_TOKENS.some((token) => autocomplete.includes(token))) return true;
  const normalizedName = name.replace(/[-_]+/g, " ");
  const normalizedId = id.replace(/[-_]+/g, " ");
  if (SENSITIVE_NAME_PATTERN.test(normalizedName) || SENSITIVE_NAME_PATTERN.test(normalizedId)) {
    return true;
  }
  return false;
}

// src/semantic-model/relationships.ts
function resolveIdRefs(attrValue, doc, idOf) {
  if (!attrValue) return [];
  return attrValue.split(/\s+/).filter(Boolean).map((refId) => doc.getElementById(refId)).filter((target) => target !== null).map((target) => idOf(target)).filter((id) => id !== void 0);
}
function resolveFormOwner(el) {
  const withForm = el;
  if (withForm.form) return withForm.form;
  return el.closest("form");
}
function extractRelationships(el, idOf) {
  const doc = el.ownerDocument;
  const labelledBy = resolveIdRefs(el.getAttribute("aria-labelledby"), doc, idOf);
  const describedBy = resolveIdRefs(el.getAttribute("aria-describedby"), doc, idOf);
  const controls = resolveIdRefs(el.getAttribute("aria-controls"), doc, idOf);
  const formOwnerEl = resolveFormOwner(el);
  const formOwner = formOwnerEl ? idOf(formOwnerEl) : void 0;
  const relationships = {};
  if (labelledBy.length) relationships.labelledBy = labelledBy;
  if (describedBy.length) relationships.describedBy = describedBy;
  if (controls.length) relationships.controls = controls;
  if (formOwner) relationships.formOwner = formOwner;
  return Object.keys(relationships).length > 0 ? relationships : void 0;
}

// src/shared/uuid.ts
function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}

// src/semantic-model/builder.ts
var BUCKET_NAMES = [
  "regions",
  "forms",
  "navigation",
  "actions",
  "dialogs",
  "errors"
];
var SKIP_TAGS = /* @__PURE__ */ new Set(["script", "style", "template"]);
var NATIVE_SEMANTIC_TAGS = /* @__PURE__ */ new Set([
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "nav",
  "form",
  "dialog",
  "header",
  "footer",
  "aside",
  "main",
  "article",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6"
]);
function classifyBucket(role, el) {
  switch (role) {
    case "button":
    case "link":
      return "actions";
    case "input":
    case "form":
      return "forms";
    case "navigation":
      return "navigation";
    case "dialog":
      return "dialogs";
    case "alert":
    case "error":
      return "errors";
    case "heading":
    case "region":
    case "banner":
    case "contentinfo":
    case "complementary":
    case "main":
    case "article":
      return "regions";
    default:
      return el.hasAttribute("role") ? "regions" : null;
  }
}
function shouldSkipTag(el) {
  return SKIP_TAGS.has(el.tagName.toLowerCase());
}
function isElementNode(node) {
  return node.nodeType === 1;
}
function isDisabled(el) {
  return el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true";
}
function hasAriaAttributes(el) {
  for (const attr of Array.from(el.attributes)) {
    if (attr.name === "role" || attr.name.startsWith("aria-")) return true;
  }
  return false;
}
function isNativeSemanticTag(el) {
  return NATIVE_SEMANTIC_TAGS.has(el.tagName.toLowerCase());
}
function safeBoundingRect(el) {
  try {
    const rect = el.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  } catch {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
}
function safeComputedStyle(el) {
  try {
    const view = el.ownerDocument?.defaultView;
    return view ? view.getComputedStyle(el) : null;
  } catch {
    return null;
  }
}
function computeState(el) {
  const tag = el.tagName.toLowerCase();
  if (tag === "input") {
    const input = el;
    const type = (input.type || "text").toLowerCase();
    if (type === "checkbox" || type === "radio") return { checked: input.checked };
    return { value: input.value };
  }
  if (tag === "textarea") return { value: el.value };
  if (tag === "select") return { value: el.value };
  if (el.hasAttribute("aria-expanded")) {
    return { expanded: el.getAttribute("aria-expanded") === "true" };
  }
  if (el.hasAttribute("aria-checked")) {
    return { checked: el.getAttribute("aria-checked") === "true" };
  }
  return void 0;
}
function emptyModel(route) {
  return {
    version: SEMANTIC_MODEL_VERSION,
    page: { url: "", title: "", route, capturedAt: (/* @__PURE__ */ new Date()).toISOString() },
    regions: [],
    forms: [],
    navigation: [],
    actions: [],
    dialogs: [],
    errors: [],
    visibleElements: [],
    modelId: generateId(),
    generation: 0
  };
}
var SemanticModelBuilder = class _SemanticModelBuilder {
  constructor() {
    this.lastModel = null;
    this.lastDoc = null;
    this.lastRoute = "";
    // Identity bookkeeping — persists across builds so re-renders that don't
    // change (path, role, name) keep their id, and so removed elements free
    // their disambiguator slot for reuse.
    this.idMeta = /* @__PURE__ */ new WeakMap();
    this.disambiguatorsInUse = /* @__PURE__ */ new Map();
    this.liveElements = /* @__PURE__ */ new Map();
    // Mutation-rate limiter state.
    this.mutationBatchTimestamps = [];
    this.pendingMutations = [];
    this.debounceTimer = null;
  }
  static {
    this.MAX_ELEMENTS = 1500;
  }
  static {
    this.RATE_LIMIT_WINDOW_MS = 1e3;
  }
  static {
    this.RATE_LIMIT_MAX_BATCHES = 50;
  }
  static {
    this.DEBOUNCE_MS = 150;
  }
  /** Full rebuild — page load or SPA route change (ADR-003 "Lifecycle: Creation"). */
  buildFull(doc, route) {
    try {
      this.lastDoc = doc;
      this.lastRoute = route;
      this.disambiguatorsInUse = /* @__PURE__ */ new Map();
      this.liveElements = /* @__PURE__ */ new Map();
      const buckets = {
        regions: [],
        forms: [],
        navigation: [],
        actions: [],
        dialogs: [],
        errors: []
      };
      const partials = [];
      let visitedCount = 0;
      let truncated = false;
      const visit = (parent) => {
        for (const child of Array.from(parent.children)) {
          if (truncated) return;
          if (shouldSkipTag(child)) continue;
          if (visitedCount >= _SemanticModelBuilder.MAX_ELEMENTS) {
            truncated = true;
            return;
          }
          visitedCount++;
          try {
            const core = this.computeCore(child);
            if (core) {
              const id = this.assignId(child, core);
              const semantic = this.buildSemanticFields(child, id, core.role, core.name);
              partials.push({ el: child, id, bucket: core.bucket, semantic });
            }
          } catch (err) {
            console.warn("[AUA][semantic-model] skipping element", err);
          }
          visit(child);
        }
      };
      const root = doc.body ?? doc.documentElement;
      if (root) visit(root);
      const idOf = (target) => this.idMeta.get(target)?.id;
      const visibleElements = [];
      for (const p of partials) {
        const relationships = extractRelationships(p.el, idOf);
        const finalEl = relationships ? { ...p.semantic, relationships } : { ...p.semantic };
        buckets[p.bucket].push(finalEl);
        if (finalEl.visible) visibleElements.push(finalEl.id);
      }
      const model = {
        version: SEMANTIC_MODEL_VERSION,
        page: {
          url: doc.URL ?? "",
          title: doc.title ?? "",
          route,
          capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
          ...truncated ? { mainIntent: "truncated:element-cap-exceeded" } : {}
        },
        regions: buckets.regions,
        forms: buckets.forms,
        navigation: buckets.navigation,
        actions: buckets.actions,
        dialogs: buckets.dialogs,
        errors: buckets.errors,
        visibleElements,
        modelId: generateId(),
        generation: 0
      };
      this.lastModel = model;
      this.mutationBatchTimestamps = [];
      this.pendingMutations = [];
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      return model;
    } catch (err) {
      console.warn("[AUA][semantic-model]", err);
      return this.lastModel ?? emptyModel(route);
    }
  }
  /** Incremental diff — MutationObserver batches (ADR-003 "Lifecycle: Update"). */
  buildIncremental(mutations) {
    try {
      if (!this.lastModel || !this.lastDoc) {
        return this.buildFull(this.lastDoc ?? document, this.lastRoute);
      }
      const now = Date.now();
      this.mutationBatchTimestamps.push(now);
      this.mutationBatchTimestamps = this.mutationBatchTimestamps.filter(
        (t) => now - t <= _SemanticModelBuilder.RATE_LIMIT_WINDOW_MS
      );
      if (this.mutationBatchTimestamps.length > _SemanticModelBuilder.RATE_LIMIT_MAX_BATCHES) {
        this.pendingMutations.push(...mutations);
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          const queued = this.pendingMutations;
          this.pendingMutations = [];
          this.debounceTimer = null;
          try {
            this.lastModel = this.applyMutations(queued);
          } catch (err) {
            console.warn("[AUA][semantic-model]", err);
          }
        }, _SemanticModelBuilder.DEBOUNCE_MS);
        return this.lastModel;
      }
      const updated = this.applyMutations(mutations);
      this.lastModel = updated;
      return updated;
    } catch (err) {
      console.warn("[AUA][semantic-model]", err);
      return this.lastModel ?? emptyModel(this.lastRoute);
    }
  }
  // ---- internals ---------------------------------------------------------
  computeCore(el) {
    const role = inferRole(el);
    const bucket = classifyBucket(role, el);
    if (!bucket) return null;
    const name = inferAccessibleName(el);
    const path = computeStructuralPath(el);
    return { path, role, name, bucket };
  }
  claimSlot(key) {
    let set = this.disambiguatorsInUse.get(key);
    if (!set) {
      set = /* @__PURE__ */ new Set();
      this.disambiguatorsInUse.set(key, set);
    }
    let n = 0;
    while (set.has(n)) n++;
    set.add(n);
    return n;
  }
  markUsed(key, n) {
    let set = this.disambiguatorsInUse.get(key);
    if (!set) {
      set = /* @__PURE__ */ new Set();
      this.disambiguatorsInUse.set(key, set);
    }
    set.add(n);
  }
  releaseSlot(key, n) {
    const set = this.disambiguatorsInUse.get(key);
    if (!set) return;
    set.delete(n);
    if (set.size === 0) this.disambiguatorsInUse.delete(key);
  }
  /**
   * Assigns (or reuses) the id for `el`. The same DOM node with an unchanged
   * (path, role, name) key always reuses its previous id/disambiguator slot —
   * this is what makes identity resilient to full rebuilds. A brand new node,
   * or a node whose key changed enough that it's no longer "the same logical
   * element", claims the smallest free slot for its new key.
   */
  assignId(el, core) {
    const key = `${core.path}\0${core.role}\0${core.name}`;
    const existing = this.idMeta.get(el);
    if (existing && existing.key === key) {
      this.markUsed(key, existing.disambiguator);
      this.liveElements.set(existing.id, el);
      return existing.id;
    }
    if (existing) this.releaseSlot(existing.key, existing.disambiguator);
    const disambiguator = this.claimSlot(key);
    const id = makeElementId(el, core.path, core.role, core.name, disambiguator);
    this.idMeta.set(el, { id, key, disambiguator });
    this.liveElements.set(id, el);
    return id;
  }
  releaseElement(el) {
    const meta = this.idMeta.get(el);
    if (!meta) return;
    this.releaseSlot(meta.key, meta.disambiguator);
    this.liveElements.delete(meta.id);
    this.idMeta.delete(el);
  }
  buildSemanticFields(el, id, role, name) {
    const ariaHidden = el.getAttribute("aria-hidden") === "true";
    const style = safeComputedStyle(el);
    const displayNone = style?.display === "none";
    const visibilityHidden = style?.visibility === "hidden";
    const visible = !ariaHidden && !displayNone && !visibilityHidden;
    const focusable = visible && isNativelyFocusable(el) && !isDisabled(el);
    const rect = safeBoundingRect(el);
    const sensitive = isSensitive(el);
    const requiredCapabilities = inferRequiredCapabilities(el);
    const provenance = hasAriaAttributes(el) ? "aria" : isNativeSemanticTag(el) ? "dom" : "heuristic";
    const confidence = provenance === "aria" ? 0.95 : provenance === "dom" ? 0.9 : 0.6;
    const state = computeState(el);
    const validation = el.getAttribute("aria-invalid") === "true" ? { valid: false } : void 0;
    const semantic = {
      id,
      role,
      accessibleName: name,
      requiredCapabilities,
      visible,
      focusable,
      geometry: rect,
      sensitive,
      confidence,
      provenance
    };
    if (state !== void 0) semantic.state = state;
    if (validation !== void 0) semantic.validation = validation;
    return semantic;
  }
  removeById(id, buckets, visibleSet) {
    for (const bucket of BUCKET_NAMES) {
      const idx = buckets[bucket].findIndex((e) => e.id === id);
      if (idx !== -1) buckets[bucket].splice(idx, 1);
    }
    visibleSet.delete(id);
    this.liveElements.delete(id);
  }
  removeSubtree(el, buckets, visibleSet) {
    const meta = this.idMeta.get(el);
    if (meta) this.removeById(meta.id, buckets, visibleSet);
    this.releaseElement(el);
    for (const child of Array.from(el.children)) this.removeSubtree(child, buckets, visibleSet);
  }
  /**
   * Applies a batch of MutationRecords to `this.lastModel`, splicing only the
   * affected SemanticElements into/out of the correct buckets rather than
   * rebuilding the whole page (ADR-003 "incremental diff on mutation").
   */
  applyMutations(mutations) {
    const base = this.lastModel;
    const buckets = {
      regions: [...base.regions],
      forms: [...base.forms],
      navigation: [...base.navigation],
      actions: [...base.actions],
      dialogs: [...base.dialogs],
      errors: [...base.errors]
    };
    const visibleSet = new Set(base.visibleElements);
    const removedRoots = /* @__PURE__ */ new Set();
    const addedRoots = /* @__PURE__ */ new Set();
    const attrTargets = /* @__PURE__ */ new Set();
    for (const record of mutations) {
      if (record.type === "attributes" && isElementNode(record.target)) {
        attrTargets.add(record.target);
      } else if (record.type === "childList") {
        record.removedNodes.forEach((n) => {
          if (isElementNode(n)) removedRoots.add(n);
        });
        record.addedNodes.forEach((n) => {
          if (isElementNode(n)) addedRoots.add(n);
        });
      }
    }
    for (const root of removedRoots) this.removeSubtree(root, buckets, visibleSet);
    const toUpsert = [];
    const collect = (el) => {
      if (shouldSkipTag(el)) return;
      toUpsert.push(el);
      for (const child of Array.from(el.children)) collect(child);
    };
    attrTargets.forEach((el) => {
      if (el.isConnected) toUpsert.push(el);
    });
    addedRoots.forEach((el) => {
      if (el.isConnected && !shouldSkipTag(el)) collect(el);
    });
    const partials = /* @__PURE__ */ new Map();
    for (const el of toUpsert) {
      try {
        const core = this.computeCore(el);
        const priorId = this.idMeta.get(el)?.id;
        if (!core) {
          const stale = this.idMeta.get(el);
          if (stale) this.removeSubtree(el, buckets, visibleSet);
          continue;
        }
        const id = this.assignId(el, core);
        const staleId = priorId !== void 0 && priorId !== id ? priorId : void 0;
        const semantic = this.buildSemanticFields(el, id, core.role, core.name);
        partials.set(el, { id, staleId, bucket: core.bucket, semantic });
      } catch (err) {
        console.warn("[AUA][semantic-model] skipping element", err);
      }
    }
    const idOf = (target) => this.idMeta.get(target)?.id;
    for (const [el, { id, staleId, bucket, semantic }] of partials) {
      const relationships = extractRelationships(el, idOf);
      const finalEl = relationships ? { ...semantic, relationships } : semantic;
      if (staleId !== void 0) this.removeById(staleId, buckets, visibleSet);
      this.removeById(id, buckets, visibleSet);
      buckets[bucket].push(finalEl);
      this.liveElements.set(id, el);
      if (finalEl.visible) visibleSet.add(id);
      else visibleSet.delete(id);
    }
    return {
      ...base,
      page: { ...base.page },
      regions: buckets.regions,
      forms: buckets.forms,
      navigation: buckets.navigation,
      actions: buckets.actions,
      dialogs: buckets.dialogs,
      errors: buckets.errors,
      visibleElements: Array.from(visibleSet),
      generation: base.generation + 1
    };
  }
};

// src/content/content-script.ts
var AUA_VERSION = "1";
var builder = new SemanticModelBuilder();
var liveRegion = null;
var proxyCounter = 0;
function ensureLiveRegion() {
  if (liveRegion && liveRegion.isConnected) return liveRegion;
  if (!document.body.id) document.body.id = "aua-body-anchor";
  const region = document.createElement("a11y-live-region");
  region.targetElementId = document.body.id;
  document.body.appendChild(region);
  liveRegion = region;
  return region;
}
function hasAccessibleName(el) {
  if (el.getAttribute("aria-label")?.trim()) return true;
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy && document.getElementById(labelledBy)?.textContent?.trim()) return true;
  if (el.labels) {
    for (const label of Array.from(el.labels)) {
      if (label.textContent?.trim()) return true;
    }
  }
  return false;
}
function guessLabel(el) {
  const placeholder = el.getAttribute("placeholder");
  if (placeholder?.trim()) return placeholder.trim();
  const name = el.getAttribute("name");
  if (name?.trim()) return name.trim().replace(/[-_]+/g, " ");
  return "Campo senza etichetta";
}
function resolveMissingLabelBarriers() {
  const fields = document.querySelectorAll(
    "input:not([type=hidden]):not([data-aua-proxied]), textarea:not([data-aua-proxied])"
  );
  fields.forEach((el) => {
    if (el.closest("a11y-field-proxy")) return;
    el.setAttribute("data-aua-proxied", "true");
    if (hasAccessibleName(el)) return;
    if (!el.id) el.id = `aua-field-${++proxyCounter}`;
    const label = guessLabel(el);
    const proxy = document.createElement("a11y-field-proxy");
    proxy.targetElementId = el.id;
    proxy.setAttribute("label", label);
    if (el instanceof HTMLInputElement && el.type) {
      proxy.setAttribute("field-type", el.type);
    }
    proxy.setAttribute("value", el.value ?? "");
    proxy.addEventListener("a11y-value-change", (event) => {
      const detail = event.detail;
      el.value = detail.value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    el.insertAdjacentElement("afterend", proxy);
    ensureLiveRegion().announce(
      `Barriera di accessibilit\xE0 rilevata e risolta: campo "${label}" senza etichetta \u2014 aggiunta versione accessibile.`,
      6e3
    );
  });
}
var currentModel = null;
function getCurrentModel() {
  return currentModel;
}
function injectPageBridge() {
  const bridgeUrl = chrome.runtime.getURL("dist/content/page-bridge.js");
  const script = document.createElement("script");
  script.src = bridgeUrl;
  script.type = "module";
  (document.head ?? document.documentElement).appendChild(script);
}
function handleBridgeMessage(event) {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (typeof data !== "object" || data === null || data["auaVersion"] !== AUA_VERSION) {
    return;
  }
  if (data["type"] === "AUA_ROUTE_CHANGE") {
    currentModel = builder.buildFull(document, window.location.pathname);
  }
}
function init() {
  injectPageBridge();
  window.addEventListener("message", handleBridgeMessage);
  currentModel = builder.buildFull(document, window.location.pathname);
  resolveMissingLabelBarriers();
  const observer = new MutationObserver((mutations) => {
    currentModel = builder.buildIncremental(mutations);
    resolveMissingLabelBarriers();
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true
  });
}
init();
export {
  getCurrentModel
};
//# sourceMappingURL=content-script.js.map
