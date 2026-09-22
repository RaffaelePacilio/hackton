# ADR-015: Privacy / Data Handling

**Status:** ACCEPTED (architecture), PROPOSED (specific GDPR legal conclusions — requires legal review)
**Date:** 2026-09-22 | **Owners:** Security & Privacy Architect

## Decision

- **Local-first processing**: `SemanticPageModel` construction, barrier detection against
  static rules, and skill execution happen entirely in-browser; only ambiguous/inference cases
  invoke a remote reasoning call (ADR-005/006), and only with a redacted slice.
- **Data minimization / redaction**: enforced structurally (ADR-003 `redact.ts`), not by
  convention — `sensitive` fields (password, payment, PII heuristics) never leave the browser
  process as values, only as presence/state booleans.
- **Data never sent to models**: raw DOM, `sensitive` element values, unredacted audio
  recordings beyond the active session, mobile pairing tokens, session credentials.
- **Data sent to models**: redacted `SemanticPageModel` slices, non-sensitive transcript text,
  the active `Barrier` being reasoned about.
- **Log/telemetry redaction**: `AuditEvent.redacted = true` mandatory for any event touching a
  `sensitive` element; telemetry payloads are schema-validated against this rule before
  ingestion (ADR-016).
- **Audio/transcript retention**: session-scoped by default; `rawUtterance` not persisted beyond
  the active session (agent-contract.md). Longer retention requires explicit, revocable user
  consent and is off by default.
- **Consent & session expiration**: `InteractionContract` and paired-session credentials expire
  on a configurable TTL; explicit consent gate required before enabling voice audio capture.

## European privacy / GDPR posture
This ADR states architectural intent (data minimization, purpose limitation, local-first
processing, redaction-by-construction) that is *supportive of* GDPR compliance. **It does not
constitute a legal compliance claim.** A named legal/DPO review is a required gate before any
production launch handling EU user data (tracked as an open question below), consistent with
Section 15's explicit instruction not to claim compliance without evidence.

## Consequences
Local-first processing increases in-browser compute/complexity (ADR-001, ADR-003) but
substantially reduces the data-protection surface area needing legal review.

## Revisit triggers
Any change that would send `sensitive`-flagged data upstream requires revoking this ADR's
acceptance and a fresh review.

## Open questions
- **NEEDS LEGAL REVIEW**: formal DPIA (Data Protection Impact Assessment) for voice audio
  processing and mobile pairing token handling before any EU production launch.

## References
Section 3.15.
