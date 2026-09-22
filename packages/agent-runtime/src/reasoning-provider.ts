import type { AdaptationPlan, Barrier, UserIntent } from "@aua/contracts";

/**
 * A pre-redacted slice of the SemanticPageModel handed to a reasoning
 * provider. Never includes `value`/raw content for `sensitive` elements —
 * callers are expected to have already run the page model through
 * `@aua/contracts`'s `redact()` before constructing this slice.
 */
export interface RedactedSemanticSlice {
  elements: Array<{
    id: string;
    role: string;
    accessibleName: string;
    visible: boolean;
    sensitive: boolean;
  }>;
}

/**
 * The LLM abstraction boundary for the browser-runtime "Adaptation
 * Reasoning" agent role (ADR-005). Implementations are provider-specific
 * (real model client, stub fixture, or a degraded-mode null object) and are
 * never invoked directly by skill code — only through `BrowserOrchestrator`,
 * which is the deterministic shell around this single agentic surface.
 */
export interface ReasoningProvider {
  readonly name: string;

  /**
   * Single-shot reasoning call: given an unresolved Barrier and the
   * available registered skills, produce an AdaptationPlan constrained to
   * reference one of those skills. Implementations may throw — callers
   * (the orchestrator) must treat any rejection as a degraded-mode signal.
   */
  planAdaptation(input: {
    barrier: Barrier;
    context: RedactedSemanticSlice;
    availableSkillIds: string[];
  }): Promise<AdaptationPlan>;

  /**
   * Single-shot reasoning call resolving an ambiguous voice/text utterance
   * into a structured UserIntent. May throw under the same degraded-mode
   * contract as `planAdaptation`.
   */
  resolveIntent(input: {
    utterance: string;
    context: RedactedSemanticSlice;
  }): Promise<UserIntent>;

  /** Cheap liveness probe — never throws. */
  healthCheck(): Promise<boolean>;
}
