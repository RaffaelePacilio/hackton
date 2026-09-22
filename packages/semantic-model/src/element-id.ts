import type { ElementId } from "@aua/contracts";

/**
 * Resolves a stable `ElementId` for `el`.
 *
 * `ElementId` doubles as a real DOM id: a later consumer (`AuaElement` in
 * `packages/web-components/src/base/AuaElement.ts`) resolves proxied target
 * elements via `document.getElementById(this.targetElementId)`, so whatever
 * id we hand out here MUST also work as a `document.getElementById` lookup.
 *
 * Rule:
 *  - If `el.id` is already non-empty, use it verbatim — the page authored a
 *    stable identity for this element and we should not fight it.
 *  - Otherwise synthesize `aua-${role}-${counter()}` and WRITE IT BACK onto
 *    `el.id`.
 *
 * This is a minimal, intentional DOM mutation: without writing the
 * synthesized id back onto the element, `document.getElementById` would
 * never find it again, and the whole proxy-resolution path in
 * `web-components` would break for any element the page itself didn't give
 * an id. The mutation is scoped to a single attribute and never touches
 * anything else about the element.
 *
 * Known limitation: because the synthesized id is written into the page's
 * own `id` attribute namespace, it could — in pathological cases — collide
 * with an id the page's own CSS uses for a `#id` selector (e.g. if the page
 * later adds an element with `id="aua-slider-3"` of its own). This is a
 * documented, accepted risk for v1; a future revision could move to a
 * dedicated `data-aua-id` attribute plus a compatibility shim in the
 * `web-components` resolution path, but that is out of scope here.
 */
export function resolveElementId(el: Element, counter: () => number): ElementId {
  const existing = el.id;
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const role = inferRoleForId(el);
  const synthesized = `aua-${role}-${counter()}`;
  el.id = synthesized;
  return synthesized;
}

// Local, dependency-free role sniff used only to name the synthesized id —
// deliberately not the full `inferRole` heuristic table (that would create a
// circular dependency between element-id.ts and role-inference.ts for no
// real benefit; the id just needs a human-readable-ish prefix).
function inferRoleForId(el: Element): string {
  const role = el.getAttribute("role");
  if (role && role.trim()) return role.trim().toLowerCase();
  return el.tagName.toLowerCase();
}
