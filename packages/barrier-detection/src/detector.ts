import type { Barrier, InteractionContract, SemanticElement, SemanticPageModel } from "@aua/contracts";
import { deriveAvailableCapabilities } from "./capability-mapping.js";

export interface BarrierDetectionOptions {
  /**
   * Elements with `confidence` below this threshold are still checked, but
   * any barrier found on them is reported with `severity: "unknown"`
   * rather than the severity the rule logic would otherwise assign — the
   * model isn't confident it read the element correctly, so asserting
   * "blocking" or "usability" would overstate what's actually known.
   * Default 0.5.
   */
  minConfidenceForBlocking?: number;
}

/**
 * WP-012 — Barrier Detection Engine.
 *
 * Per ADR-005 ("Agent roles resolution"), Barrier Analysis is one of the
 * roles explicitly listed as a **deterministic service**, not an LLM agent:
 * pure, synchronous, rule-based comparison of `SemanticElement.requiredCapabilities`
 * against the capabilities derived from the user's `InteractionContract`.
 * No reasoning provider, no async calls, no model involved — every
 * `Barrier` this engine produces is `determinedBy: "rule"`.
 */
export class BarrierDetectionEngine {
  detect(
    model: SemanticPageModel,
    contract: InteractionContract,
    options: BarrierDetectionOptions = {},
  ): Barrier[] {
    const minConfidence = options.minConfidenceForBlocking ?? 0.5;
    const available = deriveAvailableCapabilities(contract);
    const barriers: Barrier[] = [];

    const allElements = [
      ...model.regions,
      ...model.forms,
      ...model.navigation,
      ...model.actions,
      ...model.dialogs,
      ...model.errors,
    ];

    for (const el of allElements) {
      // Invisible elements cannot currently obstruct interaction — there is
      // nothing on screen for the user to be blocked by. If the element
      // becomes visible in a later model generation, it is evaluated then.
      if (!el.visible) continue;

      const missing = el.requiredCapabilities.filter((cap) => !available.includes(cap));

      if (missing.length > 0) {
        const severity = this.classifyCapabilitySeverity(el, missing, minConfidence);
        barriers.push(this.buildBarrier(el, available, severity));
        continue;
      }

      // Every required capability is available, so the element is
      // operable — but it may still fail to honor a stated user
      // *preference*. This is a distinct concern from "can the user
      // interact with this at all," so it gets its own check rather than
      // being folded into the missing-capabilities branch above.
      if (this.hasUnmetPreference(el, contract)) {
        const severity: Barrier["severity"] =
          el.confidence < minConfidence ? "unknown" : "preference-mismatch";
        barriers.push(this.buildBarrier(el, available, severity));
      }
    }

    return barriers;
  }

  /**
   * Classifies the severity of a barrier caused by one or more missing
   * required capabilities. Only called when `missing.length > 0`, so the
   * result is always one of "unknown" | "blocking" | "usability" — never
   * "none" or "preference-mismatch" (those belong to different code paths).
   */
  private classifyCapabilitySeverity(
    el: SemanticElement,
    missing: string[],
    minConfidence: number,
  ): Barrier["severity"] {
    // (a) Confidence gate, checked first: if the model isn't confident it
    // correctly captured this element's role/capabilities, asserting a
    // specific severity would overstate certainty. Per ADR-004's
    // conservative-default philosophy, an "unknown" barrier is a request
    // for confirmation, not a claim — never assume worst- or best-case.
    if (el.confidence < minConfidence) return "unknown";

    // (b) No partial path exists at all: every required capability is
    // missing, so there is nothing left for the user to fall back on.
    if (missing.length === el.requiredCapabilities.length) return "blocking";

    // (b, cont'd) Capabilities with no reasonable substitute. Losing any
    // ONE of these is blocking even while other required capabilities
    // remain available, because nothing else in the capability vocabulary
    // can stand in for them:
    //  - "drag": no non-drag equivalent for a drag-only interaction.
    //  - "precision-targeting": nothing else lets a user hit a small,
    //    precisely-positioned target.
    //  - "hover": hover-only affordances (e.g. hover-to-reveal menus) have
    //    no non-hover trigger by definition.
    //  - "keyboard": keyboard operability is the accessibility baseline
    //    fallback (WCAG 2.1.1). If it is itself required and missing —
    //    this branch only runs when 0 < missing.length < required.length,
    //    so some OTHER required capability is also unavailable — the user
    //    has no full path at all.
    const noSubstitute = ["drag", "precision-targeting", "hover", "keyboard"];
    if (missing.some((cap) => noSubstitute.includes(cap))) return "blocking";

    // (c) Some, but not all, required capabilities are missing, and none
    // of the missing ones are on the no-substitute list above — a
    // plausible alternate path exists (e.g. pointer still works even
    // though complex-shortcuts doesn't). The element is usable, just not
    // via every path it was designed for.
    return "usability";
  }

  /**
   * Real, checkable signals that a stated `InteractionContract.preferences`
   * entry is not being honored by the page — distinct from "can the user
   * operate this element at all." Only called when every required
   * capability is already available, so this never overlaps with
   * `classifyCapabilitySeverity`.
   */
  private hasUnmetPreference(el: SemanticElement, contract: InteractionContract): boolean {
    // largeTargets: WCAG 2.5.5 / common mobile-a11y guidance treats 44x44
    // CSS px as the minimum comfortable target size. The element is still
    // operable below that size, but it works against a preference the user
    // explicitly declared — and geometry is a real, measured signal, not a
    // guess.
    if (contract.preferences.largeTargets && (el.geometry.width < 44 || el.geometry.height < 44)) {
      return true;
    }

    // reducedMotion: only flagged when the model itself recorded the
    // element as animated (a real signal captured in `state`), never
    // inferred from role or absence of data — that would violate the
    // "never infer" invariant ADR-004 sets for this contract.
    if (contract.preferences.reducedMotion && el.state?.animated === true) {
      return true;
    }

    // spokenFeedback is intentionally NOT checked here for v1: there is no
    // reliable per-element signal in the current SemanticElement shape
    // (e.g. a captured live-region/announcement flag) to check against
    // without guessing. Left as a documented gap rather than an inferred
    // false positive/negative.

    return false;
  }

  private buildBarrier(
    el: SemanticElement,
    available: string[],
    severity: Barrier["severity"],
  ): Barrier {
    return {
      barrierId: crypto.randomUUID(),
      elementId: el.id,
      requiredCapabilities: el.requiredCapabilities,
      availableCapabilities: available,
      blockedIntent: el.probableBusinessIntent,
      severity,
      confidence: el.confidence,
      determinedBy: "rule",
    };
  }
}
