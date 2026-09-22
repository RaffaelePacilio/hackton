# 04 — Runtime Flows

Each scenario names every component involved and the contract objects exchanged between them.
Contract types are defined in `docs/contracts/`.

## Scenario A — "Compila il mio numero di telefono"

1. **Voice Client** captures audio → **Speech Provider** streams partial/final transcript
   (`SpeechEvent`).
2. **Intent Engine** maps the final transcript to a `UserIntent`:
   `{ intent: "fill-field", semanticTarget: "phone-number", value: "<spoken digits>" }`.
3. **Adaptation Planner** consults the current `SemanticPageModel` for an element whose
   `probableBusinessIntent` matches `phone-number`. If more than one candidate exists above the
   disambiguation threshold, it emits a **confirmation prompt** rather than guessing (ADR-004
   disambiguation policy).
4. Planner selects skill `focus_semantic_field` then `fill_field` (`SkillInvocation`).
5. **Skill Executor** runs `focus_semantic_field` (scroll into view, set focus, DOM-safe) then
   `fill_field` using the **Safe Interaction Strategy** appropriate to the detected framework
   (native `value` setter + synthetic `input`/`change` events for React-controlled inputs; see
   ADR-010).
6. **Verification Engine** re-reads the field's DOM value and confirms it matches the intended
   value (`VerificationResult`).
7. On success, **Voice Client** requests **Speech Provider** TTS: "Numero di telefono inserito."
8. All steps emit `AuditEvent`s with `interaction_id`, `skill_execution_id` correlation IDs to
   the Observability Pipeline (redacted: the phone number itself is never included in telemetry
   payloads — see ADR-015).

## Scenario B — "Imposta il prezzo massimo a mille euro" on a drag-only control

1. **Semantic Page Model Builder** identifies a range/slider control with
   `requiredCapabilities: ["pointer","drag"]` and `probableBusinessIntent: "set-max-price"`.
2. **Barrier Detection Engine** compares against the `InteractionContract`
   (`actions.drag: "unavailable"`) and emits a `Barrier` with `severity: "blocking"`.
3. **Adaptation Planner** selects `inject_stepper` (deterministic rule: drag-blocking barrier on
   a numeric range control → stepper adapter is the default resolution; this is a rule, not an
   LLM inference, per ADR-003 "prefer deterministic rules").
4. **Web Component Injector** mounts `<a11y-stepper>` in Shadow DOM, proxy-bound to the original
   slider's underlying value/state (never replacing the original element).
5. **Intent Engine** resolves the voice utterance to
   `{ intent: "set-value", semanticTarget: "max-price", value: 1000, unit: "EUR" }`.
6. **Skill Executor** runs `fill_field` (targeting the stepper proxy, which in turn synchronizes
   the original control's framework state).
7. **Verification Engine** reads back the *original* control's underlying value/state (not just
   the proxy's displayed value) to confirm `1000` was actually propagated to the target
   application.
8. TTS announces success; on verification failure, the Planner attempts one bounded retry, then
   reports a failed adaptation rather than a false "success" claim.

## Scenario C — SPA route change

1. **Accessible Routing Layer** observes `pushState`/`popstate`/DOM heading change and emits a
   `NavigationEvent`.
2. **Semantic Page Model Builder** invalidates the stale model and rebuilds incrementally
   (mutation-driven diff, not full rebuild, per ADR-003 lifecycle rules).
3. **Barrier Detection Engine** re-evaluates barriers against the new model.
4. **Routing Layer** restores logical focus (heading or primary landmark) and, if the user's
   `preferences.spokenFeedback` is true, announces the new route's semantic title via the
   `<a11y-live-region>` component.
5. No LLM call is required for a pure navigation event — this path is fully deterministic.

## Scenario D — "Cosa posso fare in questa pagina?"

1. **Intent Engine** classifies this as a `describe-page` intent (no target element).
2. **Adaptation Planner** requests a natural-language summary. This is the one path where an
   LLM reasoning call is intentionally used for synthesis, over the **redacted**
   `SemanticPageModel` (regions, forms, primary actions) — never raw DOM, never field values.
3. Response is streamed to TTS and/or rendered in `<a11y-reader>`.
4. This flow is read-only: no skill execution, no verification step required, lowest capability
   class (`READ`).

## Scenario E — Agent encounters sensitive/password/payment data

1. **Semantic Page Model Builder** tags fields with `type: password`, `autocomplete:
   cc-number`, or heuristically detected payment/auth context as `sensitive: true`.
2. These fields are **excluded by default** from any data sent to an LLM provider — the
   `SemanticElement` sent upstream contains role/geometry/state metadata only, never the value.
3. **Barrier Detection Engine** may still detect a modality barrier here (e.g., password field
   unreachable via keyboard-only nav), but any skill in capability class `AUTHENTICATE` or
   `PAYMENT` requires **explicit per-action user confirmation** (ADR-014) — auto-execution is
   prohibited regardless of confidence score.
4. Verification for these fields checks only *state* (e.g., "field now has a non-empty value" or
   "form advanced to next step"), never the value itself, and telemetry redacts the field
   contents unconditionally.
