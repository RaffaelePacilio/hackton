# ADR-020: Deployment Topology

**Status:** PROPOSED — pattern accepted, exact infra vendor pending
**Date:** 2026-09-22 | **Owners:** Platform/Observability Architect

## Decision (pattern)
- **Browser extension**: distributed via each browser's extension store; versioned
  independently of backend, with the skill-schema additive-versioning discipline (ADR-008)
  ensuring an older extension can safely talk to a newer backend and vice versa within a
  supported compatibility window.
- **Backend control plane**: containerized services (Session Gateway, Agent Orchestration
  Service, Skill Registry Service, Mobile Pairing Service) behind a load balancer, horizontally
  scalable per-service; Session Gateway is the single ingress and is called out as a component
  requiring explicit HA design (multi-instance, sticky-session-free where possible) before
  production, not a single point of failure left unaddressed.
- **Voice service**: stateless proxy/session-broker to the chosen `SpeechProvider`(s) (ADR-007),
  scaled independently since audio session concurrency profiles differ from HTTP request
  patterns.
- **Mobile companion**: standard app store distribution, versioned against the same pairing
  protocol contract (ADR-012).
- **Observability**: OpenTelemetry collector → backend of choice (ADR-016), deployed as a
  sidecar/agent pattern to avoid coupling application deploys to observability backend changes.

## Failure isolation
Each control-plane service fails independently; Session Gateway implements circuit breakers per
downstream service (Agent Orchestration, Skill Registry, Pairing) so one degraded dependency
does not cascade (Section 17 reliability requirements).

## Consequences
Deferring exact cloud/infra vendor is intentional at this architecture stage — the
service-boundary and failure-isolation pattern is what parallel implementation agents need; infra
vendor is an operational decision made with real cost/scale data.

## Open questions
- Cloud vendor / region selection — **NEEDS VERIFICATION** against EU data-residency
  requirements from ADR-015.

## References
Section 19 (implied), 22.
