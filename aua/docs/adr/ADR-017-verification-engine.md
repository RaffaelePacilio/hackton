# ADR-017: Verification Engine

**Status:** ACCEPTED | **Date:** 2026-09-22 | **Owners:** Principal Architect, Testing/Evaluation Architect

## Context
No adaptation is "successful" merely because an LLM claims success (Section 3.13).

## Decision
Every `SkillInvocation` with a `verificationStrategy` produces a mandatory `VerificationResult`
(`skill-contract.md`) before the Skill Executor reports `status: "success"` to the caller.
Verification methods: `dom-read` (re-read target field/state), `route-check` (confirm expected
route/semantic page change), `state-diff` (compare pre/post `SemanticPageModel` snapshots),
`accessibility-check` (confirm injected adapter is present in the accessibility tree with
expected role/name).

## Retry / timeout / idempotency / rollback
- **Timeout**: each verification has a bounded wait (default 2s, tunable per skill) before
  declaring `failureClass: "timeout"`.
- **Retry**: at most one bounded retry of the *same* skill invocation on verification failure,
  never silent infinite retry.
- **Idempotency**: skills are designed to be safely re-invoked (e.g., `fill_field` setting the
  same value twice is a no-op, not a duplicate side effect) — declared per skill in its
  `SkillDefinition`.
- **Rollback**: skills declaring `rollback: "supported"` implement an inverse operation invoked
  automatically on verification failure for DESTRUCTIVE-class actions; `not-applicable`/
  `manual-only` skills surface a clear failure state instead of a false rollback claim.
- **Failure classification**: `timeout | mismatch | element-gone | framework-blocked`, each
  driving a distinct user-facing message rather than a generic "something went wrong."

## Consequences
Every write-class skill has a matching verification cost — accepted, since unverified success
claims directly undermine user trust and safety in an accessibility tool.

## Revisit triggers
Verification false-negative rate (adaptation actually succeeded but verification incorrectly
reports failure) observed in Phase 2 usability testing above an acceptable threshold — tune
timeouts/methods, not the mandatory-verification principle.

## References
Section 3.13.
