# ADR-001: Runtime Topology

**Status:** ACCEPTED | **Date:** 2026-09-22 | **Owners:** Principal Architect, Browser Extension Architect

## Context
The platform must act on live third-party DOM in real time (sub-second) while relying on LLM
reasoning that has network latency and variable availability.

## Problem
Where does "the runtime" actually live: fully in-browser, fully server-side, or split? A
server-side runtime cannot touch the DOM directly; a fully in-browser runtime cannot centrally
audit/rate-limit/version skills across a fleet.

## Decision drivers
Latency, resilience to backend/LLM outage, auditability, security boundary clarity, ability to
degrade gracefully.

## Options considered
1. **Fully browser-resident** (extension does everything, including LLM calls via a proxied key).
2. **Fully server-side** (extension is a dumb DOM proxy streaming the whole page to a server).
3. **Deterministic shell in-browser, agentic decision calls out to a thin backend.**

## Decision matrix

| Criterion (weight) | Fully browser | Fully server | Split (chosen) |
|---|---|---|---|
| Latency for DOM ops (5) | 5 | 1 | 5 |
| Backend-outage resilience (5) | 5 | 1 | 4 (Bootstrap still works) |
| Central audit/versioning (4) | 1 | 5 | 4 |
| Security boundary clarity (5) | 2 | 4 | 5 |
| Streaming full DOM off-device (privacy, 4) | 5 (never leaves) | 1 | 5 (never leaves) |

## Decision
**Deterministic shell, agentic decisions**, split as: DOM reading/writing, skill execution,
verification, and the Universal Accessibility Bootstrap run **in the browser extension**.
Reasoning steps that require an LLM (barrier→plan inference, "describe this page", ambiguous
intent resolution) are routed through a **thin backend control plane** (Session Gateway → Agent
Orchestration Service) which holds provider credentials and enforces redaction, never the raw
DOM.

## Detailed architecture
See `01-system-context.md` container view. The Bootstrap has zero dependency on the backend
being reachable. The extension caches the last-known `SkillDefinition` set and can execute
**rule-based** (non-LLM) adaptation plans fully offline for common barrier patterns (e.g.
drag-blocking-barrier → `inject_stepper` is a static rule, not an inference call).

## Interfaces/contracts
`SemanticPageModel`, `Barrier`, `AdaptationPlan`, `SkillInvocation` (see `docs/contracts/`).

## Security considerations
No privileged browser API (cross-origin fetch with credentials, downloads, clipboard) is ever
exposed to LLM-generated content; the LLM output space is constrained to `chosenSkillId` +
`inputs` matching a registered `inputSchema`.

## Accessibility considerations
Bootstrap is WCAG-tested independently of the agentic layer's health.

## Privacy considerations
DOM never leaves the browser process except as a redacted `SemanticPageModel` projection.

## Operational considerations
Backend outage → extension degrades to rule-based adaptation + Bootstrap; agentic-only features
(free-text intent, page summarization) are disabled with a clear inline status, not a silent
failure.

## Failure modes
- Backend unreachable → degrade, log locally, retry with backoff.
- LLM provider failure → ADR-006 failover.
- Corrupted local skill cache → re-fetch from Skill Registry Service on next reachable session.

## Consequences / Trade-offs
Pro: best latency and resilience profile. Con: two deployment targets (extension + backend) to
version in lockstep for skill schema changes — mitigated by additive-only skill versioning
(`skill-contract.md`).

## Rejected alternatives
Fully server-side rejected primarily on privacy (raw DOM/page content would have to transit to
a server) and latency grounds.

## Migration strategy
N/A (greenfield).

## Revisit triggers
If browser extension APIs materially restrict background compute (e.g. further MV3 service
worker lifecycle restrictions) such that local rule evaluation becomes unreliable.

## Open questions
- Exact backoff/retry budget for backend calls before showing degraded-mode UI (NEEDS
  VERIFICATION — should be settled with real latency data in Phase 2).

## References
Section 2, 3.1, 22 of the source brief.
