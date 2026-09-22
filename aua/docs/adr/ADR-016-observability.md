# ADR-016: Observability / Tracing

**Status:** ACCEPTED | **Date:** 2026-09-22 | **Owners:** Platform/Observability Architect

## Decision
Adopt **OpenTelemetry** semantic conventions for traces/metrics, with a custom span/attribute
schema layered on top for domain correlation IDs: `session_id`, `page_id`, `interaction_id`,
`agent_run_id`, `skill_execution_id`, `adaptation_id`, `voice_turn_id` (all defined once in
`docs/contracts/agent-contract.md`'s `AuditEvent.correlationIds`).

## Covered signals
Agent traces (`AgentDecision` latency/outcome), skill executions (`SkillInvocation`/`SkillResult`
timing and status), model calls (provider, latency, token counts — never prompt/response content
for sensitive interactions), STT/TTS latency, DOM analysis / semantic-model refresh latency,
adaptation success rate, verification success rate, provider cost, model fallback events,
errors, accessibility task completion.

## Redaction enforcement at the telemetry boundary
This is the second (after `semantic-model/src/redact.ts`) structurally-enforced redaction point:
the Observability Pipeline **rejects** any ingested event where `redacted` is false but the
event's correlation touches a `SemanticElement` flagged `sensitive` in the same interaction —
implemented as an ingestion-time validator, not a downstream cleanup job.

## Failure modes
Observability pipeline failure must never block user-facing action (Section 3.16 principle
"never block on telemetry") — emission is fire-and-forget with local buffering and drop-oldest
backpressure, not synchronous.

## Consequences
Slight risk of telemetry gaps during pipeline outages — accepted, since blocking accessibility
actions on telemetry availability would violate the platform's core purpose.

## Revisit triggers
If sampling/volume at production scale requires a dedicated high-cardinality trace backend
decision (NEEDS VERIFICATION — vendor selection deferred to Phase 4 based on real volume).

## References
Section 3.16.
