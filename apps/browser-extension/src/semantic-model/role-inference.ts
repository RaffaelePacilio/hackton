// role-inference.ts — role + accessible-name inference (ADR-003 §"DOM-shaped tree").
// Heuristic, pragmatic, and intentionally simple — not a full ARIA AAM implementation.

const BUTTON_INPUT_TYPES = new Set(["submit", "button", "reset", "image"]);
const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

/**
 * Infers a role string for `el`. An explicit `role` attribute always wins (the
 * author's own declared semantics); everything else is a tag/attribute-based
 * fallback. Note: `role="alert"` is returned verbatim here — the builder's
 * bucket-classification step (not this function) treats both "alert" and the
 * heuristic "error" role as belonging to the `errors` bucket, so the two paths
 * don't need to be unified into a single string.
 */
export function inferRole(el: Element): string {
  const explicit = el.getAttribute("role");
  if (explicit && explicit.trim()) return explicit.trim().toLowerCase();

  const tag = el.tagName.toLowerCase();

  // Native controls whose primary affordance is "activate an action".
  if (tag === "button") return "button";
  if (tag === "input" && BUTTON_INPUT_TYPES.has((el.getAttribute("type") || "").toLowerCase())) {
    return "button";
  }

  // Only anchors with an actual destination are navigational controls — a bare
  // <a> with no href is not focusable/operable and isn't a "link" in practice.
  if (tag === "a" && el.hasAttribute("href")) return "link";

  // Remaining form-field tags collapse to the generic "input" role — the
  // contract doesn't need per-widget-type roles, just enough to bucket the
  // element as a form field.
  if (tag === "input" || tag === "textarea" || tag === "select") return "input";

  if (tag === "nav") return "navigation";
  if (tag === "form") return "form";
  if (tag === "dialog") return "dialog";
  if (HEADING_TAGS.has(tag)) return "heading";

  // HTML5 sectioning landmarks that map onto their well-known ARIA landmark role.
  if (tag === "main") return "main";
  if (tag === "header") return "banner";
  if (tag === "footer") return "contentinfo";
  if (tag === "aside") return "complementary";
  if (tag === "article") return "article";

  // A live region currently showing text is our best runtime proxy for a
  // validation/error message surface (we can't tell WHY it's live, only that it
  // is one and it currently has content worth surfacing).
  const ariaLive = (el.getAttribute("aria-live") || "").toLowerCase();
  if (ariaLive === "polite" || ariaLive === "assertive") {
    const text = (el.textContent || "").trim();
    if (text) return "error";
  }

  // A named <section> is a generic landmark region; an unnamed one carries no
  // extra semantics over a <div> and falls through to "unknown" below.
  if (tag === "section" && (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"))) {
    return "region";
  }

  // Leaf-ish elements that carry visible text but no other semantics are kept
  // as plain "text" so the builder can decide whether they're worth surfacing;
  // everything else is genuinely uninteresting structurally.
  const hasText = (el.textContent || "").trim().length > 0;
  const hasElementChildren = el.children.length > 0;
  if (hasText && !hasElementChildren) return "text";

  return "unknown";
}

function resolveLabelElement(el: Element): Element | null {
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

const FORM_FIELD_TAGS = new Set(["input", "textarea"]);
const TEXT_FALLBACK_TAGS = new Set(["button", "a"]);
const TEXT_FALLBACK_ROLES = new Set(["button", "link"]);

/**
 * Pragmatic accessible-name computation, in priority order:
 * aria-label → aria-labelledby → associated <label> → placeholder (form fields
 * only, last resort) → title → visible text (buttons/links only) → "".
 * This is a deliberate subset of the full W3C accname algorithm — good enough
 * for barrier detection, not a spec-conformant implementation.
 */
export function inferAccessibleName(el: Element): string {
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const doc = el.ownerDocument;
    const text = labelledBy
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => doc.getElementById(id)?.textContent?.trim() ?? "")
      .filter((s) => s.length > 0)
      .join(" ");
    if (text) return text;
  }

  const label = resolveLabelElement(el);
  if (label) {
    const text = (label.textContent || "").trim();
    if (text) return text;
  }

  // Placeholder is explicitly a last-resort hint per WCAG guidance, never a
  // substitute for a real label — only consulted here after label lookups fail.
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
