# ADR-013: State Management

**Status:** ACCEPTED | **Date:** 2026-09-22 | **Owners:** Principal Architect

## Context
State is split across browser (ephemeral, per-tab), backend (session/audit), and mobile
(paired-session).

## Decision
- **Browser extension**: in-memory `SemanticPageModel` + `InteractionContract` cached in
  extension local storage (survives service-worker restarts, not synced to backend by default).
  No global mutable singleton — state is scoped per-tab session (`session_id` + `page_id`).
- **Backend control plane**: LangGraph-managed checkpointed state (ADR-005) for
  multi-turn/long-running flows (mobile pairing lifecycle, multi-step page-summary
  conversations); a relational/document store (ADR-019) for durable session/audit records.
- **Cross-boundary sync**: one-directional, event-based — browser emits `AuditEvent`s and
  session summaries to the backend; backend never pushes silent state mutations back into the
  browser's `SemanticPageModel` (the model of the page can only be correct if it is built from
  the actual live DOM, not from a backend's stale copy).

## Consequences
Backend outage cannot corrupt browser-local state, consistent with ADR-001's degraded-mode
requirement.

## Revisit triggers
If cross-device continuity (resume a session on a different browser instance) becomes a
requirement — would need backend-authoritative `InteractionContract` sync, a deliberate
architecture change requiring its own ADR revision.

## References
Section 3.11, 9.
