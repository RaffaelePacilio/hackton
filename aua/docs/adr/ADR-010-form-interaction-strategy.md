# ADR-010: Form Interaction Strategy (Safe Interaction Strategy)

**Status:** ACCEPTED | **Date:** 2026-09-22 | **Owners:** Browser Extension Architect, Form Agent owner

## Context
Directly setting `.value` on a React-controlled input does not trigger the framework's internal
state update, silently breaking the interaction (Section 3.5).

## Decision
The Form Agent (deterministic service, not an LLM agent — ADR-005) implements a **framework
detection + safe-write strategy**:

1. Detect the underlying framework/control type heuristically (React fiber marker presence,
   Angular's `ng-*` attributes, Vue's reactivity markers, native custom elements/Shadow-root
   controls, or plain HTML) — best-effort, with plain-HTML native event dispatch as the
   universal fallback.
2. For native/plain HTML: set `.value` and dispatch `input`/`change` events directly.
3. For React-controlled inputs: use the native input value setter
   (`Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set`) before
   dispatching a synthetic `input` event, so React's change-detection observes the update
   (documented, widely-used technique; **NEEDS VERIFICATION** against current React versions at
   implementation time since internals are not a public contract).
4. For custom select/combobox/shadow-root controls: prefer simulating the actual user-facing
   interaction sequence (focus → keyboard/synthetic pointer events matching the component's
   documented interaction pattern) over direct state manipulation, since these often have no
   simple settable `.value`.
5. Every write is followed by the Verification Engine reading back actual state — this ADR
   assumes writes can silently fail and treats verification as mandatory, not optional.

## Risks explicitly analyzed
- Native DOM value setting bypasses framework state → mitigated by the native setter + synthetic
  event technique above, with verification as the safety net regardless.
- Synthetic events may not perfectly replicate all trusted-event characteristics some sites
  check for (e.g. `isTrusted`) → documented as a **known coverage boundary**; sites with strict
  trusted-event requirements may reject synthetic writes, surfaced to the user as a failed
  adaptation rather than a false success.
- Shadow-root custom controls may not expose a stable interaction surface → Form Agent falls
  back to `inject_field_proxy` (an accessible overlay control that itself performs the
  documented interaction) rather than attempting deep internal manipulation.

## Consequences
No single technique works for 100% of frameworks/components; the architecture accepts this and
makes verification (not blind write success) the source of truth for user-facing success
messaging.

## Revisit triggers
Framework internals changes that break the native-setter technique; discovery of a more robust
cross-framework write mechanism.

## References
Section 3.5.
