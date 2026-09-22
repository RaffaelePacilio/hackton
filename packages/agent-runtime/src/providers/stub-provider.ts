import type { AdaptationPlan, UserIntent } from "@aua/contracts";
import type { ReasoningProvider } from "../reasoning-provider.js";

/**
 * Deterministic ReasoningProvider fixture for tests. Callers pre-load a map
 * of `barrierId -> AdaptationPlan` so `planAdaptation` never has to guess —
 * used by this package's own tests and by downstream consumers (e.g.
 * WP-014) that need a stable, non-LLM reasoning provider.
 */
export class StubProvider implements ReasoningProvider {
  readonly name = "stub";

  constructor(private readonly responses: Map<string, AdaptationPlan>) {}

  async planAdaptation(input: { barrier: { barrierId: string } }): Promise<AdaptationPlan> {
    const plan = this.responses.get(input.barrier.barrierId);
    if (!plan) {
      throw new Error("no-stub-response");
    }
    return plan;
  }

  async resolveIntent(): Promise<UserIntent> {
    return {
      intentId: crypto.randomUUID(),
      intent: "describe-page",
      confidence: 1,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
