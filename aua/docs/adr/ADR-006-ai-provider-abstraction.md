# ADR-006: AI Provider Abstraction

**Status:** ACCEPTED | **Date:** 2026-09-22 | **Owners:** AI/Agent Framework Architect

## Context
No single LLM vendor should be assumed permanent (Section 22). The Adaptation Reasoning step
(ADR-005) must be swappable.

## Decision
Define a `ReasoningProvider` interface in `packages/agent-runtime`:

```typescript
interface ReasoningProvider {
  name: string;
  planAdaptation(input: { barrier: Barrier; context: RedactedSemanticSlice }): Promise<AdaptationPlan>;
  resolveIntent(input: { utterance: string; context: RedactedSemanticSlice }): Promise<UserIntent>;
  summarizePage(input: { context: RedactedSemanticSlice }): Promise<string>;
  healthCheck(): Promise<boolean>;
}
```

Concrete adapters implement this per vendor. The Agent Orchestration Service selects a provider
via configuration and a **fallback chain** (primary → secondary → rule-only degraded mode).
Structured output (JSON-schema-constrained generation / tool-calling) is required at the
adapter boundary so `AdaptationPlan`/`UserIntent` validity does not depend on vendor-specific
prompting idiosyncrasies.

## Decision drivers
Vendor lock-in avoidance, ability to A/B evaluate model quality (ADR-018), graceful degradation.

## Failure modes
Provider timeout/error → orchestrator retries once against secondary provider, then falls back
to rule-only resolution (no adaptation offered beyond static rules) with a clear degraded-mode
signal to the user — never a silent hang.

## Security/Privacy considerations
Only the redacted `SemanticPageModel` slice ever crosses this interface — see ADR-015 and the
redaction rule in `semantic-page-model.md`. Provider data-retention policy is a configuration
concern per deployment (EU data residency requirements may restrict which providers are
eligible — NEEDS VERIFICATION per customer contract, not assumed globally).

## Consequences
Slightly higher integration cost per provider (schema-constrained output isn't universally
implemented identically) — accepted as the cost of portability.

## Revisit triggers
A provider offering materially better structured-output reliability or price/performance that
justifies promoting it to primary.

## References
Section 3.11, 22.
