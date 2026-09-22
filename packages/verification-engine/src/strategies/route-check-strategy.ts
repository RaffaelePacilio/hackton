import type { VerificationResult } from "@aua/contracts";
import { raceWithTimeout, TIMEOUT_SENTINEL } from "../timeout-race.js";

/**
 * `route-check` verification (ADR-017): confirms the expected route or
 * semantic page change actually happened after a NAVIGATE-class skill
 * invocation. A `null` from `readCurrentRoute` means "no current route
 * could be determined" — the closest semantic fit is `element-gone` (the
 * thing we expected to read doesn't exist), same as `dom-read`.
 */
export async function verifyRouteCheck(
  invocationId: string,
  expectedRoute: string,
  timeoutMs: number,
  readCurrentRoute: () => Promise<string | null> | string | null,
): Promise<VerificationResult> {
  const observed = await raceWithTimeout(() => readCurrentRoute(), timeoutMs);

  if (observed === TIMEOUT_SENTINEL) {
    return {
      invocationId,
      verified: false,
      method: "route-check",
      failureClass: "timeout",
      expectedValue: expectedRoute,
    };
  }

  if (observed === null) {
    return {
      invocationId,
      verified: false,
      method: "route-check",
      failureClass: "element-gone",
      expectedValue: expectedRoute,
    };
  }

  if (observed !== expectedRoute) {
    return {
      invocationId,
      verified: false,
      method: "route-check",
      failureClass: "mismatch",
      observedValue: observed,
      expectedValue: expectedRoute,
    };
  }

  return {
    invocationId,
    verified: true,
    method: "route-check",
    observedValue: observed,
    expectedValue: expectedRoute,
  };
}
