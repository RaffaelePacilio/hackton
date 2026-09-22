import type { VerificationResult } from "@aua/contracts";
import { raceWithTimeout, TIMEOUT_SENTINEL } from "../timeout-race.js";

/**
 * `dom-read` verification (ADR-017): re-reads the target element/field after
 * a skill invocation and compares the observed value against what the skill
 * claimed to set. `readFn` is caller-injected — this package never touches
 * the DOM itself, only orchestrates the read/timeout/classify sequence.
 */
export async function verifyDomRead(
  invocationId: string,
  elementId: string,
  expectedValue: unknown,
  timeoutMs: number,
  readFn: (elementId: string) => Promise<string | null> | string | null,
): Promise<VerificationResult> {
  const observed = await raceWithTimeout(() => readFn(elementId), timeoutMs);

  if (observed === TIMEOUT_SENTINEL) {
    return {
      invocationId,
      verified: false,
      method: "dom-read",
      failureClass: "timeout",
      expectedValue,
    };
  }

  if (observed === null) {
    return {
      invocationId,
      verified: false,
      method: "dom-read",
      failureClass: "element-gone",
      expectedValue,
    };
  }

  if (observed !== expectedValue) {
    return {
      invocationId,
      verified: false,
      method: "dom-read",
      failureClass: "mismatch",
      observedValue: observed,
      expectedValue,
    };
  }

  return {
    invocationId,
    verified: true,
    method: "dom-read",
    observedValue: observed,
    expectedValue,
  };
}
