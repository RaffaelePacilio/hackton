// identity.ts — stable ElementId derivation (ADR-003 "Element identity strategy").
//
// Goal: a composite key of (nearest stable ancestor + role + accessible name + a
// per-key disambiguator) that is STABLE across re-renders which preserve semantic
// role/position but swap the underlying DOM node (e.g. a React re-render of the
// same logical field), and correctly invalidated when the element is genuinely
// removed. This is a documented, tunable heuristic, not a guarantee — see ADR-003
// "NEEDS VERIFICATION against real SPA re-render patterns".

import type { ElementId } from "@aua/contracts";

// Tags/roles that make an ancestor a good "stable anchor" for the path prefix:
// they tend to survive re-renders even when their descendants are torn down and
// rebuilt (landmarks, forms, dialogs). An ancestor with an explicit `id` attribute
// is preferred over all of these since author-assigned ids are the strongest
// stability signal available at runtime.
const LANDMARK_TAGS = new Set([
  "nav",
  "main",
  "header",
  "footer",
  "aside",
  "form",
  "dialog",
  "section",
  "article",
]);

const LANDMARK_ROLES = new Set([
  "banner",
  "navigation",
  "main",
  "complementary",
  "contentinfo",
  "region",
  "form",
  "dialog",
  "search",
]);

/**
 * Walks up from `el` (excluding `el` itself) to the nearest ancestor that offers a
 * stable anchor: an `id` attribute, an explicit ARIA landmark role, or a native
 * landmark tag. Falls back to a fixed "root:body" anchor when none is found.
 *
 * Deliberately NOT a sibling-index chain (e.g. `div:nth-child(3)`) — that shifts
 * whenever a sibling is inserted/removed anywhere earlier in the list, which would
 * churn ids on every unrelated DOM change. Anchoring on the nearest *named*
 * ancestor is far more resilient to incidental reordering.
 */
export function computeStructuralPath(el: Element): string {
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

// FNV-1a 32-bit — small, fast, deterministic. Not cryptographic; collisions are
// astronomically unlikely at the <=1500-element page scale this model targets,
// and even a collision only degrades identity heuristics, it never breaks
// serialization (ids are just opaque strings from the contract's point of view).
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Builds the final ElementId from the composite identity key.
 *
 * `disambiguator` is a monotonic counter scoped to (path, role, name) collisions
 * on the same page (e.g. two nav items both named "Edit") — it is assigned and
 * tracked by the caller (SemanticModelBuilder), not derived here, since only the
 * caller knows the set of currently-live elements sharing that key.
 *
 * The Element itself only contributes its tag name to the hash (extra
 * specificity without depending on the node's identity/reference) — the same
 * (path, role, name, disambiguator, tag) tuple always yields the same id, which
 * is exactly what lets a freshly re-rendered-but-semantically-identical node
 * keep its predecessor's id.
 */
export function makeElementId(
  el: Element,
  path: string,
  role: string,
  name: string,
  disambiguator: number
): ElementId {
  const tag = el.tagName ? el.tagName.toLowerCase() : "unknown";
  const composite = [path, role, tag, name.trim().toLowerCase(), String(disambiguator)].join(
    "\u0001"
  );
  return `aua-${fnv1a(composite)}`;
}
