# ADR-009: Web Component Adaptation Strategy

**Status:** ACCEPTED | **Date:** 2026-09-22 | **Owners:** Web Components Architect

## Context
Injected accessible controls must not needlessly replace the target site's original components
(Section 3.6).

## Decision
**Proxy/Adapter pattern**: injected Web Components (`<a11y-field-proxy>`, `<a11y-stepper>`,
`<a11y-choice-list>`, `<a11y-command-palette>`, `<a11y-route-menu>`, `<a11y-focus-guide>`,
`<a11y-action-panel>`, `<a11y-reader>`, `<a11y-live-region>`, `<a11y-skip-navigation>`,
`<a11y-voice-input>`) are mounted in **closed Shadow DOM** roots the extension creates
alongside the original element (overlay/adjacent, not replacing it in the light DOM), and
bidirectionally synchronize state with the original control through the Safe Interaction
Strategy defined in ADR-010.

## Formal contract

```typescript
interface AccessibilityAdapter {
  targetElementId: string;       // SemanticElement.id of the original control
  semanticIntent: string;
  interactionContract: InteractionContract;
  adaptationConfig: { skillId: string; mountPoint: "adjacent" | "overlay"; zIndexStrategy: "isolated-stacking-context" };
}
```

## Shadow DOM vs Light DOM
Closed Shadow DOM chosen for style isolation and CSS-conflict prevention; accepted trade-off is
reduced external stylability, mitigated by CSS custom properties exposed intentionally as the
adapter's theming API.

## Accessibility-tree exposure
Shadow DOM content is exposed to the accessibility tree by all evergreen browsers in scope; ARIA
relationships that must cross the shadow boundary (e.g., `aria-describedby` pointing at
light-DOM content) use `aria-owns`-style patterns or duplicate minimal text content inside the
shadow root where cross-boundary ARIA referencing is unreliable (NEEDS VERIFICATION per browser
at implementation time).

## State synchronization, cleanup, SPA rerenders
Adapter lifecycle is bound to the `SemanticElement.id` it proxies (ADR-003 identity strategy):
on element removal/generation change, the adapter unmounts; on SPA re-render preserving the same
logical element, the adapter persists and re-binds. `MutationObserver` disconnection and Shadow
root removal are mandatory on unmount to prevent leaks.

## Failure modes
Original control removed while adapter is focused → focus is moved to the nearest surviving
landmark (`restore_focus` skill), never left dangling.

## Consequences
More integration work per adapter (must track and re-bind to a moving target) vs. simply
replacing the original control — accepted because Section 3.6 explicitly prohibits unnecessary
replacement and destructive replacement risks breaking the target site's own JS logic bound to
the original DOM node.

## Revisit triggers
Browser accessibility-tree/Shadow DOM interoperability changes.

## References
Section 3.6.
