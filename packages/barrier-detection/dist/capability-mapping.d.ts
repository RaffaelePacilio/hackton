import type { InteractionContract } from "@aua/contracts";
/**
 * Translates a user's declared `InteractionContract` into the flat set of
 * capability tags the `SemanticPageModel` builder uses in
 * `SemanticElement.requiredCapabilities` (e.g. "pointer", "keyboard",
 * "drag", "hover", "precision-targeting").
 *
 * Conservative-default principle (ADR-004, "Fallback behavior"): only
 * `"available"` counts as usable. `"difficult"` and `"unknown"` are
 * deliberately NOT treated as available — the system must never assume the
 * best case for a capability it isn't sure about, and "difficult" means the
 * user *can* do it but at a cost the detector should not silently paper
 * over by pretending it's free. Barriers surfaced for `"unknown"` fields
 * downstream are expected to carry `severity: "unknown"` rather than being
 * auto-resolved (ADR-004, "Fallback behavior").
 */
export declare function deriveAvailableCapabilities(contract: InteractionContract): string[];
//# sourceMappingURL=capability-mapping.d.ts.map