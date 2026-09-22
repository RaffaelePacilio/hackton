# ADR-019: Persistence / Storage

**Status:** PROPOSED — vendor selection pending Phase 2 sizing; architecture pattern accepted
**Date:** 2026-09-22 | **Owners:** Platform/Observability Architect

## Decision (pattern, vendor-agnostic)
- **Session/audit store** (backend): a document or relational store holding session metadata,
  `AuditEvent` records (redacted per ADR-015/016), and mobile pairing history — access-controlled,
  with a defined retention/expiry policy per data class (session metadata short-lived, audit
  records retained per compliance requirement, **NEEDS VERIFICATION** exact retention windows
  pending legal review, ADR-015).
- **LangGraph checkpoint store** (backend control plane, ADR-005): a durable checkpointer for
  resumable multi-step workflows (mobile pairing lifecycle, multi-turn page-summary
  conversations) — in-memory acceptable for early phases, DB-backed required before production
  (explicit open question, tracked in ADR-005).
- **Skill Registry store**: versioned, source-controlled JSON definitions (`packages/skill-sdk`)
  are the source of truth, not a runtime-mutable database — deploys, not writes, change the
  registry.
- **Browser-local storage**: `InteractionContract` and cached skill definitions in extension
  storage; never synced server-side by default (ADR-013).

## Explicitly excluded from persistence
Raw audio beyond active session, raw DOM snapshots, `sensitive`-flagged field values, unredacted
transcripts beyond active session.

## Consequences
Deferring exact vendor selection is intentional — the pattern (what is stored, what is
excluded, redaction-at-ingestion) is the architecturally load-bearing decision; vendor choice is
an implementation detail properly resolved with real Phase 2 volume/cost data.

## Open questions
- Exact audit-record retention window — **NEEDS LEGAL REVIEW** (ADR-015).
- Checkpoint store vendor for LangGraph — **NEEDS VERIFICATION** against Phase 2 durability
  requirements.

## References
Section 3.19 (implied by ADR set), 19.
