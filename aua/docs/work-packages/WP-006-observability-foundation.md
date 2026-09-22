id: WP-006
title: Observability Foundation
phase: Foundation
parallel_group: PG-0

goal: >
  Stand up the OpenTelemetry-based tracing/metrics foundation and the AuditEvent
  ingestion-time redaction validator, ready for every later package to emit into.

depends_on: []
blocks: [WP-020]

architecture_refs:
  - ADR-016

output_contracts:
  - AuditEvent ingestion API (fire-and-forget, non-blocking client)

owned_paths:
  - packages/observability/**

forbidden_paths:
  - packages/contracts/** (consume AuditEvent type once WP-001 lands; stub until then)

responsibilities:
  - OpenTelemetry-conformant span/metric emission client usable from both browser extension and
    backend contexts.
  - Ingestion-time validator that rejects any event with redacted=false touching a
    sensitive-flagged element (per ADR-016) — implemented as a hard gate, not a warning.
  - Local buffering + drop-oldest backpressure so telemetry never blocks the caller.

non_goals:
  - No specific dashboarding/backend vendor selection (ADR-016 defers this).

implementation_requirements:
  - Client API must be safe to call with the pipeline fully down (no exceptions propagate to
    caller).

security_requirements:
  - Redaction validator is the second enforcement point (after packages/contracts redact()) —
    test that a deliberately malformed non-redacted sensitive event is rejected, not merely
    logged.

tests_required:
  unit: true
  integration: true
  e2e: false

acceptance_criteria:
  - Emitting 10,000 events with the backend artificially killed does not throw, block, or leak
    memory unboundedly (bounded buffer verified).
  - A crafted "sensitive but unredacted" event is provably rejected at ingestion.

deliverables:
  - packages/observability/

integration_notes:
  - All later Work Packages should wire their skill/agent/voice events through this client's
    API once available; do not hand-roll parallel telemetry paths.

risks:
  - None blocking; low-risk foundational package.

definition_of_done:
  - Merged, documented client API, redaction gate test passing.
