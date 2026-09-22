// capability-inference.ts — required-interaction-capability heuristics.
// Pragmatic and heuristic by design (ADR-003 token-reduction / barrier-detection
// input), not a formal spec. Each branch below carries a one-line rationale
// rather than a treatise — tune the heuristics here as real-site evidence comes in.

const CLICKABLE_TAGS = new Set(["button", "a", "input", "select", "textarea"]);
const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "menuitem",
  "tab",
  "checkbox",
  "radio",
  "switch",
  "option",
]);

/**
 * True when `el` is reachable via Tab and operable via Enter/Space without any
 * pointer at all — native form controls, real links, and anything with a
 * non-negative tabindex. Exported for reuse by the builder's `focusable` field.
 */
export function isNativelyFocusable(el: Element): boolean {
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

// A plain click target: native interactive tags, an explicit onclick handler, or
// an ARIA widget role that implies click-to-activate semantics.
function isClickable(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (CLICKABLE_TAGS.has(tag)) return true;
  if (el.hasAttribute("onclick")) return true;
  const role = (el.getAttribute("role") || "").toLowerCase();
  return INTERACTIVE_ROLES.has(role);
}

// draggable="true", or a class/data-* hint naming a slider/drag widget — we
// can't observe an actual drag listener at runtime, so this is a naming-
// convention proxy rather than a behavioral detector.
function isDragLike(el: Element): boolean {
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

// class/data-* naming convention for "this only appears on hover" widgets
// (e.g. a hover-revealed toolbar). There is no runtime way to inspect CSS
// `:hover` rules, so this only catches elements that also self-describe via
// markup — a deliberate, documented limitation.
function hasHoverHint(el: Element): boolean {
  const className = typeof el.className === "string" ? el.className : "";
  if (/hover/i.test(className)) return true;
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith("data-") && /hover/i.test(attr.name)) return true;
  }
  return false;
}

// Defensive wrapper — a pathological element (throwing getter, detached
// fragment, hostile custom element, ...) must never take the whole model
// build down with it; treat it as an unrendered/zero-size box instead.
function safeRect(el: Element): { width: number; height: number } {
  try {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  } catch {
    return { width: 0, height: 0 };
  }
}

// Best-effort "hidden in its resting state" check: zero-size box or an explicit
// display:none/visibility:hidden. Used only in combination with `hasHoverHint`
// below, so it never mislabels ordinary elements that simply haven't been
// laid out yet (e.g. in a non-rendering test environment).
function isHiddenByDefault(el: Element): boolean {
  const rect = safeRect(el);
  const view = el.ownerDocument?.defaultView;
  const style = view ? view.getComputedStyle(el) : null;
  const zeroBox = rect.width === 0 && rect.height === 0;
  const styledHidden = style ? style.display === "none" || style.visibility === "hidden" : false;
  return zeroBox || styledHidden;
}

// "Only reachable via mouse hover": hidden by default, carries a hover-naming
// hint, and isn't independently keyboard-focusable — if it were focusable, a
// keyboard user could still reach it via Tab regardless of hover state.
function isHoverOnly(el: Element): boolean {
  return hasHoverHint(el) && !isNativelyFocusable(el) && isHiddenByDefault(el);
}

// WCAG 2.5.5-adjacent heuristic (target size): require BOTH dimensions to be
// non-zero before judging smallness, so unrendered elements (0x0 in test
// environments without real layout) never trigger a false positive.
function hasSmallTarget(el: Element): boolean {
  const rect = safeRect(el);
  if (rect.width === 0 && rect.height === 0) return false;
  return rect.width < 24 || rect.height < 24;
}

/**
 * Returns the set of interaction capabilities required to operate `el`, e.g.
 * `["pointer"]`, `["pointer","drag"]`, `["pointer","keyboard"]`,
 * `["pointer","hover"]`, `["pointer","precision-targeting"]`.
 */
export function inferRequiredCapabilities(el: Element): string[] {
  const caps = new Set<string>();

  // Baseline: anything clickable needs at least a pointer to activate it.
  if (isClickable(el)) caps.add("pointer");

  // Native controls / positive-tabindex elements are Tab+Enter reachable —
  // record keyboard as a satisfied interaction path for this element (this is
  // about which paths the element SUPPORTS, not an extra unmet requirement).
  if (isNativelyFocusable(el)) caps.add("keyboard");

  // A drag gesture is required, not just a click (range sliders, reorder
  // handles, etc.) — drag implies pointer as its baseline too.
  if (isDragLike(el)) {
    caps.add("pointer");
    caps.add("drag");
  }

  // Hover-only-discoverable widgets need pointer hover specifically, since
  // there's no keyboard equivalent for "move the mouse over this area".
  if (isHoverOnly(el)) {
    caps.add("pointer");
    caps.add("hover");
  }

  // Sub-24x24px clickable targets demand precise pointer control (fine motor
  // skill) beyond plain pointer availability.
  if (isClickable(el) && hasSmallTarget(el)) {
    caps.add("precision-targeting");
  }

  return Array.from(caps);
}
