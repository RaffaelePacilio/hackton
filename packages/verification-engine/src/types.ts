export type { VerificationResult } from "@aua/contracts";

/**
 * Caller-supplied configuration for a single verification attempt. `method`
 * mirrors `VerificationResult["method"]` from `@aua/contracts` — the
 * strategy this config selects is exactly the strategy whose name appears
 * on the resulting `VerificationResult`.
 */
export interface VerificationConfig {
  method: "dom-read" | "route-check" | "state-diff" | "accessibility-check";
  expectedValue?: unknown;
  timeoutMs?: number; // default 2000
}

/** Default verification timeout (ms) per ADR-017. */
export const DEFAULT_TIMEOUT_MS = 2000;
