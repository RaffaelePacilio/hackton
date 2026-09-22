/**
 * Traps keyboard focus within a Shadow DOM root. Tab cycles forward through
 * focusable descendants; Shift-Tab cycles backward.
 *
 * Returns a cleanup function that removes the listener — call it on unmount.
 */
export declare function trapFocus(root: ShadowRoot): () => void;
/**
 * Restores focus to a previously focused element. Safe to call with null or
 * a disconnected element — no-ops in both cases.
 */
export declare function restoreFocus(target: Element | null): void;
//# sourceMappingURL=focus-manager.d.ts.map