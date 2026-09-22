// relationships.ts — resolves the non-tree-shaped relationship graph edges
// (labelledBy/describedBy/controls/formOwner) called out in ADR-003's "hybrid
// graph/tree" decision. These are DOM id-references, so they can point anywhere
// in the document, not just within `el`'s subtree.

import type { ElementId, SemanticElement } from "@aua/contracts";

function resolveIdRefs(
  attrValue: string | null,
  doc: Document,
  idOf: (el: Element) => ElementId | undefined
): ElementId[] {
  if (!attrValue) return [];
  return attrValue
    .split(/\s+/)
    .filter(Boolean)
    .map((refId): Element | null => doc.getElementById(refId))
    // Drop refs that point at elements we don't track (not in the DOM, or not
    // significant enough to have been assigned an id ourselves) — an
    // unresolvable relationship is simply omitted rather than surfaced as null.
    .filter((target): target is Element => target !== null)
    .map((target) => idOf(target))
    .filter((id): id is ElementId => id !== undefined);
}

function resolveFormOwner(el: Element): Element | null {
  // Form-associated elements (input/select/textarea/button/...) expose a live
  // `.form` reference that already accounts for the `form=""` attribute
  // override; fall back to tree containment for anything else.
  const withForm = el as unknown as { form?: HTMLFormElement | null };
  if (withForm.form) return withForm.form;
  return el.closest("form");
}

export function extractRelationships(
  el: Element,
  idOf: (el: Element) => ElementId | undefined
): SemanticElement["relationships"] {
  const doc = el.ownerDocument;

  const labelledBy = resolveIdRefs(el.getAttribute("aria-labelledby"), doc, idOf);
  const describedBy = resolveIdRefs(el.getAttribute("aria-describedby"), doc, idOf);
  const controls = resolveIdRefs(el.getAttribute("aria-controls"), doc, idOf);

  const formOwnerEl = resolveFormOwner(el);
  const formOwner = formOwnerEl ? idOf(formOwnerEl) : undefined;

  const relationships: NonNullable<SemanticElement["relationships"]> = {};
  if (labelledBy.length) relationships.labelledBy = labelledBy;
  if (describedBy.length) relationships.describedBy = describedBy;
  if (controls.length) relationships.controls = controls;
  if (formOwner) relationships.formOwner = formOwner;

  return Object.keys(relationships).length > 0 ? relationships : undefined;
}
