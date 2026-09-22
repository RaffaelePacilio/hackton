import type { Barrier, InteractionContract, SemanticPageModel } from "@aua/contracts";
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
export declare class BarrierDetectionEngine {
    detect(model: SemanticPageModel, contract: InteractionContract, options?: BarrierDetectionOptions): Barrier[];
    /**
     * Classifies the severity of a barrier caused by one or more missing
     * required capabilities. Only called when `missing.length > 0`, so the
     * result is always one of "unknown" | "blocking" | "usability" — never
     * "none" or "preference-mismatch" (those belong to different code paths).
     */
    private classifyCapabilitySeverity;
    /**
     * Real, checkable signals that a stated `InteractionContract.preferences`
     * entry is not being honored by the page — distinct from "can the user
     * operate this element at all." Only called when every required
     * capability is already available, so this never overlaps with
     * `classifyCapabilitySeverity`.
     */
    private hasUnmetPreference;
    private buildBarrier;
}
//# sourceMappingURL=detector.d.ts.map