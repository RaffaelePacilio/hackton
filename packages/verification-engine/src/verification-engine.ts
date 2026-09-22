import type { VerificationResult } from "@aua/contracts";
import { verifyDomRead } from "./strategies/dom-read-strategy.js";
import { verifyRouteCheck } from "./strategies/route-check-strategy.js";
import { verifyStateDiff } from "./strategies/state-diff-strategy.js";
import {
  verifyAccessibility,
  type AdapterPresence,
  type ExpectedAdapter,
} from "./strategies/accessibility-check-strategy.js";
import { DEFAULT_TIMEOUT_MS, type VerificationConfig } from "./types.js";

/**
 * Per-method verification context, discriminated on `method` (mirroring
 * `VerificationConfig["method"]`) rather than one loose object with every
 * field optional — each strategy's caller-injected reads are only ever
 * relevant for its own method, and a discriminated union lets the compiler
 * (and `verify`'s switch) narrow to exactly the fields that method needs.
 */
export type VerificationContext =
  | {
      method: "dom-read";
      elementId: string;
      readFn: (elementId: string) => Promise<string | null> | string | null;
    }
  | {
      method: "route-check";
      readCurrentRoute: () => Promise<string | null> | string | null;
    }
  | {
      method: "state-diff";
      captureState: () =>
        | Promise<Record<string, unknown> | null>
        | Record<string, unknown>
        | null;
      expectedChanges: Record<string, unknown>;
    }
  | {
      method: "accessibility-check";
      readAdapterPresence: () =>
        | Promise<AdapterPresence | null>
        | AdapterPresence
        | null;
      expectedAdapter: ExpectedAdapter;
    };

const RETRY_DELAY_MS = 200;

/**
 * Orchestrates ADR-017 mandatory post-invocation verification: dispatches a
 * `SkillInvocation`'s declared `verificationStrategy` to the matching
 * strategy function, applies the bounded-retry policy (at most one retry,
 * never on `element-gone`), and runs rollback for DESTRUCTIVE-class skills
 * that declare `rollback: "supported"`. Framework-agnostic — every actual
 * read/capture/rollback operation is caller-injected.
 */
export class VerificationEngine {
  async verify(
    invocationId: string,
    config: VerificationConfig,
    context: VerificationContext,
  ): Promise<VerificationResult> {
    if (context.method !== config.method) {
      throw new Error(
        `verify: config.method ("${config.method}") does not match context.method ("${context.method}")`,
      );
    }

    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    switch (context.method) {
      case "dom-read": {
        if (!context.elementId || !context.readFn) {
          throw new Error("verify: dom-read requires elementId and readFn");
        }
        return verifyDomRead(
          invocationId,
          context.elementId,
          config.expectedValue,
          timeoutMs,
          context.readFn,
        );
      }

      case "route-check": {
        if (!context.readCurrentRoute) {
          throw new Error("verify: route-check requires readCurrentRoute");
        }
        if (typeof config.expectedValue !== "string") {
          throw new Error("verify: route-check requires config.expectedValue to be a string route");
        }
        return verifyRouteCheck(invocationId, config.expectedValue, timeoutMs, context.readCurrentRoute);
      }

      case "state-diff": {
        if (!context.captureState || !context.expectedChanges) {
          throw new Error("verify: state-diff requires captureState and expectedChanges");
        }
        return verifyStateDiff(invocationId, timeoutMs, context.captureState, context.expectedChanges);
      }

      case "accessibility-check": {
        if (!context.readAdapterPresence || !context.expectedAdapter) {
          throw new Error("verify: accessibility-check requires readAdapterPresence and expectedAdapter");
        }
        return verifyAccessibility(
          invocationId,
          timeoutMs,
          context.readAdapterPresence,
          context.expectedAdapter,
        );
      }
    }
  }

  /**
   * ADR-017 retry policy: at most one bounded retry of the same
   * verification on failure, never on `element-gone` (retrying can't make a
   * gone element reappear). Whatever the retry attempt yields — verified or
   * not — is returned as-is; there is no third attempt.
   */
  async verifyWithRetry(
    invocationId: string,
    config: VerificationConfig,
    context: VerificationContext,
  ): Promise<VerificationResult> {
    const first = await this.verify(invocationId, config, context);
    if (first.verified) return first;
    if (first.failureClass === "element-gone") return first;

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return this.verify(invocationId, config, context);
  }

  /**
   * Runs the caller-supplied inverse operation for a DESTRUCTIVE-class
   * skill that declares `rollback: "supported"` and failed verification.
   * `skillId` is accepted for logging/telemetry correlation at the call
   * site; this method never inspects `SkillDefinition.rollback` itself —
   * the caller (Skill Executor) is responsible for only invoking rollback
   * when the skill's declaration actually supports it, per ADR-017 ("
   * not-applicable/manual-only skills surface a clear failure state instead
   * of a false rollback claim").
   */
  async rollback(
    skillId: string,
    invocationId: string,
    rollbackFn: () => Promise<void>,
  ): Promise<{ rolledBack: boolean; error?: string }> {
    try {
      await rollbackFn();
      return { rolledBack: true };
    } catch (err) {
      return { rolledBack: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
