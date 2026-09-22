import type { VerificationResult } from "@aua/contracts";
import { raceWithTimeout, TIMEOUT_SENTINEL } from "../timeout-race.js";

export interface AdapterPresence {
  present: boolean;
  role?: string;
  accessibleName?: string;
}

export interface ExpectedAdapter {
  role: string;
  accessibleName?: string;
}

/**
 * `accessibility-check` verification (ADR-017): confirms an injected
 * accessible adapter (e.g. `<a11y-field-proxy>`) is present in the
 * accessibility tree with the expected role and, when requested, a
 * non-empty matching accessible name. Absence (`null` or
 * `{ present: false }`) is `element-gone`; a present adapter with the wrong
 * role/name is `mismatch`, with the actual `{role, accessibleName}` as
 * `observedValue`.
 */
export async function verifyAccessibility(
  invocationId: string,
  timeoutMs: number,
  readAdapterPresence: () =>
    | Promise<AdapterPresence | null>
    | AdapterPresence
    | null,
  expected: ExpectedAdapter,
): Promise<VerificationResult> {
  const observed = await raceWithTimeout(() => readAdapterPresence(), timeoutMs);

  if (observed === TIMEOUT_SENTINEL) {
    return {
      invocationId,
      verified: false,
      method: "accessibility-check",
      failureClass: "timeout",
      expectedValue: expected,
    };
  }

  if (observed === null || !observed.present) {
    return {
      invocationId,
      verified: false,
      method: "accessibility-check",
      failureClass: "element-gone",
      expectedValue: expected,
    };
  }

  const actual = { role: observed.role, accessibleName: observed.accessibleName };
  const roleMatches = observed.role === expected.role;
  const nameMatches =
    expected.accessibleName === undefined
      ? true
      : Boolean(observed.accessibleName) && observed.accessibleName === expected.accessibleName;

  if (!roleMatches || !nameMatches) {
    return {
      invocationId,
      verified: false,
      method: "accessibility-check",
      failureClass: "mismatch",
      observedValue: actual,
      expectedValue: expected,
    };
  }

  return {
    invocationId,
    verified: true,
    method: "accessibility-check",
    observedValue: actual,
    expectedValue: expected,
  };
}
