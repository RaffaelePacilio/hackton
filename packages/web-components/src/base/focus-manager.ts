const FOCUSABLE_SELECTOR =
  "a[href], button:not([disabled]), input:not([disabled]), " +
  "select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

function getFocusable(root: ShadowRoot): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Traps keyboard focus within a Shadow DOM root. Tab cycles forward through
 * focusable descendants; Shift-Tab cycles backward.
 *
 * Returns a cleanup function that removes the listener — call it on unmount.
 */
export function trapFocus(root: ShadowRoot): () => void {
  function onKeyDown(event: Event): void {
    const e = event as KeyboardEvent;
    if (e.key !== "Tab") return;

    const focusable = getFocusable(root);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    const active = root.activeElement as HTMLElement | null;

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

/**
 * Restores focus to a previously focused element. Safe to call with null or
 * a disconnected element — no-ops in both cases.
 */
export function restoreFocus(target: Element | null): void {
  if (target instanceof HTMLElement && target.isConnected) {
    target.focus();
  }
}
