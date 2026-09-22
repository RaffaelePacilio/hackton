/**
 * Infers a role string for `el`.
 *
 * An explicit ARIA `role` attribute always wins. Otherwise a small,
 * deliberately non-exhaustive heuristic table is applied — good enough for
 * barrier detection, not a full ARIA AAM implementation.
 */
export function inferRole(el: Element): string {
  const explicit = el.getAttribute("role");
  if (explicit && explicit.trim()) return explicit.trim().toLowerCase();

  const tag = el.tagName.toLowerCase();
  const type = (el.getAttribute("type") || "").toLowerCase();

  if (tag === "input" && type === "range") return "slider";
  if (tag === "input" && type === "number") return "spinbutton";

  if (
    tag === "button" ||
    (tag === "input" && (type === "button" || type === "submit"))
  ) {
    return "button";
  }

  if (tag === "a" && el.hasAttribute("href")) return "link";
  if (tag === "nav") return "navigation";
  if (tag === "form") return "form";
  if (tag === "input" && type === "password") return "textbox";

  return "unknown";
}
