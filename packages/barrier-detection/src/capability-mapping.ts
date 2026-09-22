import type { Availability, InteractionContract } from "@aua/contracts";

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
export function deriveAvailableCapabilities(contract: InteractionContract): string[] {
  const isUsable = (availability: Availability): boolean => availability === "available";

  const available: string[] = [];

  if (isUsable(contract.input.keyboard)) available.push("keyboard");
  if (isUsable(contract.input.pointer)) available.push("pointer");
  if (isUsable(contract.input.touch)) available.push("touch");
  if (isUsable(contract.input.voice)) available.push("voice");
  if (isUsable(contract.input.switch)) available.push("switch");

  if (isUsable(contract.actions.drag)) available.push("drag");
  if (isUsable(contract.actions.precisionTargeting)) available.push("precision-targeting");
  if (isUsable(contract.actions.complexShortcuts)) available.push("complex-shortcuts");

  // "hover" has no dedicated InteractionContract field — it is a derived
  // capability, not a directly-declared one. For v1 it is available
  // whenever pointer input is available: hovering is a pointer sub-behavior,
  // and there is no case in the current contract where pointer is available
  // but hover specifically is not. Revisit if a future contract version
  // separates hover-capable pointing (mouse) from hover-incapable pointing
  // (touch-as-pointer-emulation) explicitly.
  if (isUsable(contract.input.pointer)) available.push("hover");

  return available;
}
