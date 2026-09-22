import type { AgentDecision, Barrier, UserIntent } from "@aua/contracts";
import type { ReasoningProvider, RedactedSemanticSlice } from "./reasoning-provider.js";

/**
 * Honestly-typed result of an intent-resolution call. `AgentDecision.output`
 * is a closed union of `AdaptationPlan | confirm-with-user | decline` — none
 * of those shapes fit "here is the UserIntent I resolved," so intent
 * resolution gets its own result type instead of being forced into
 * `AgentDecision`.
 */
export interface IntentResolutionResult {
  intent: UserIntent | null;
  error?: string;
  latencyMs: number;
  modelProvider?: string;
}

/**
 * The thin custom orchestrator mandated by ADR-005 for browser-runtime
 * barrier -> plan reasoning: a deterministic shell around a single,
 * tightly-scoped LLM call per unresolved Barrier. No framework — see
 * ADR-005 for the full evidence/decision record. Every public method
 * returns a structured result; a thrown provider error is always caught and
 * converted into a `decline` (or `intent: null`) result, never rethrown.
 */
export class BrowserOrchestrator {
  constructor(private readonly provider: ReasoningProvider) {}

  async resolveBarrier(
    barrier: Barrier,
    context: RedactedSemanticSlice,
    availableSkillIds: string[],
    agentRunId: string,
  ): Promise<AgentDecision> {
    const start = performance.now();
    try {
      const plan = await this.provider.planAdaptation({ barrier, context, availableSkillIds });

      if (!availableSkillIds.includes(plan.chosenSkillId)) {
        return {
          decisionId: crypto.randomUUID(),
          agentRunId,
          input: { barrier },
          output: {
            action: "decline",
            reason: `provider selected unregistered skill "${plan.chosenSkillId}"`,
          },
          modelProvider: this.provider.name,
          latencyMs: performance.now() - start,
        };
      }

      return {
        decisionId: crypto.randomUUID(),
        agentRunId,
        input: { barrier },
        output: plan,
        modelProvider: this.provider.name,
        latencyMs: performance.now() - start,
      };
    } catch (err) {
      return {
        decisionId: crypto.randomUUID(),
        agentRunId,
        input: { barrier },
        output: {
          action: "decline",
          reason: err instanceof Error ? err.message : "reasoning-provider-error",
        },
        // modelProvider intentionally omitted: the provider call never
        // completed, so there is no decision to attribute to it (distinct
        // from AgentDecision's "omitted when purely rule-based" case, but
        // the same field-level contract: absence means "no model was the
        // basis for this output").
        latencyMs: performance.now() - start,
      };
    }
  }

  async resolveIntent(
    utterance: string,
    context: RedactedSemanticSlice,
  ): Promise<IntentResolutionResult> {
    const start = performance.now();
    try {
      const intent = await this.provider.resolveIntent({ utterance, context });
      return {
        intent,
        modelProvider: this.provider.name,
        latencyMs: performance.now() - start,
      };
    } catch (err) {
      return {
        intent: null,
        error: err instanceof Error ? err.message : "reasoning-provider-error",
        latencyMs: performance.now() - start,
      };
    }
  }
}
