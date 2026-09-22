import type { VerificationResult } from "@aua/contracts";
import { raceWithTimeout, TIMEOUT_SENTINEL } from "../timeout-race.js";

/**
 * `state-diff` verification (ADR-017): captures the current
 * `SemanticPageModel`-derived state after a skill invocation and shallow-
 * compares each key in `expectedChanges` against it. `verified` is true
 * only when every expected key matches; on mismatch, both the full captured
 * state and the full `expectedChanges` map are returned so the caller can
 * see exactly what diverged rather than just the first differing key.
 */
export async function verifyStateDiff(
  invocationId: string,
  timeoutMs: number,
  captureState: () =>
    | Promise<Record<string, unknown> | null>
    | Record<string, unknown>
    | null,
  expectedChanges: Record<string, unknown>,
): Promise<VerificationResult> {
  const observed = await raceWithTimeout(() => captureState(), timeoutMs);

  if (observed === TIMEOUT_SENTINEL) {
    return {
      invocationId,
      verified: false,
      method: "state-diff",
      failureClass: "timeout",
      expectedValue: expectedChanges,
    };
  }

  if (observed === null) {
    return {
      invocationId,
      verified: false,
      method: "state-diff",
      failureClass: "element-gone",
      expectedValue: expectedChanges,
    };
  }

  const allMatch = Object.entries(expectedChanges).every(
    ([key, value]) => observed[key] === value,
  );

  if (!allMatch) {
    return {
      invocationId,
      verified: false,
      method: "state-diff",
      failureClass: "mismatch",
      observedValue: observed,
      expectedValue: expectedChanges,
    };
  }

  return {
    invocationId,
    verified: true,
    method: "state-diff",
    observedValue: observed,
    expectedValue: expectedChanges,
  };
}
