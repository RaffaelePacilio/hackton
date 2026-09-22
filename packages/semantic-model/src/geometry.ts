import type { SemanticElement } from "@aua/contracts";

/**
 * Reads the on-screen geometry of `el` via `getBoundingClientRect()`.
 * Defensive: a pathological element (throwing getter, detached fragment,
 * hostile custom element) must never take the whole model build down — it
 * degrades to a zero-size box instead.
 */
export function readGeometry(el: Element): SemanticElement["geometry"] {
  try {
    const rect = el.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  } catch {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
}
