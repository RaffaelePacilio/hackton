import type { ReasoningProvider } from "../reasoning-provider.js";

/**
 * Degraded-mode ReasoningProvider used when no real provider is configured
 * or reachable. Mirrors the `createNullTransport` pattern in
 * `apps/browser-extension/src/background/service-worker.ts`: rather than
 * fabricate a low-confidence plan (AdaptationPlan has no confidence field to
 * signal that with), it rejects outright so the deterministic shell
 * (`BrowserOrchestrator`) can turn the failure into an explicit
 * `{ action: "decline" }` decision.
 */
export class NullProvider implements ReasoningProvider {
  readonly name = "null";

  async planAdaptation(): Promise<never> {
    throw new Error("provider-unavailable");
  }

  async resolveIntent(): Promise<never> {
    throw new Error("provider-unavailable");
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }
}
