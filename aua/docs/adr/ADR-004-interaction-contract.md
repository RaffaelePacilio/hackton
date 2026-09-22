# ADR-004: Interaction Contract

**Status:** ACCEPTED | **Date:** 2026-09-22 | **Owners:** Principal Architect, Accessibility/WCAG Architect

## Context
The system needs a stable, user-owned description of capabilities/preferences that is
explicitly **not** a diagnosis.

## Decision
Adopt the schema in `docs/contracts/interaction-contract.md` verbatim as the frozen v1.0.0
contract. Editable only through the Universal Accessibility Bootstrap, which must remain
functional independent of backend/LLM availability (ADR-001).

## Disambiguation policy
When the Adaptation Planner has more than one candidate target above a minimum confidence floor
(default 0.6, tunable) and the top two candidates are within 0.15 of each other, it MUST emit a
`{ action: "confirm-with-user" }` `AgentDecision` rather than silently picking the top-ranked
candidate.

## Confirmation policy
Governed jointly by `InteractionContract.preferences.confirmBeforeAction` and the capability
class table in `docs/contracts/skill-contract.md` — the stricter of the two applies (user
preference can only make confirmation *more* frequent, never suppress mandatory confirmations
for AUTHENTICATE/PAYMENT).

## Fallback behavior
Unknown/unset capability fields are treated as `"unknown"`, which the Barrier Engine treats as
**no barrier assumed** (never assume the worst-case or best-case silently) — instead, barriers
involving an `"unknown"` capability are surfaced as `severity: "unknown"` and are not
auto-resolved without at least one successful low-risk confirmation from the user in that
session.

## Security/Privacy considerations
No field in this contract is inferred from behavioral/interaction pattern analysis — it is
exclusively user-declared and user-editable. This is a hard architectural constraint (Section 1
of the source brief): the system must never infer medical conditions from interaction patterns.

## Consequences
Slightly more conservative barrier resolution for new users with mostly-`"unknown"` contracts,
by design — favors asking over guessing.

## Revisit triggers
If usability testing with real assistive-technology users shows the confirmation frequency is
excessive; adjust confidence floor, not the "never infer" invariant.

## References
Section 1, 3.4.
