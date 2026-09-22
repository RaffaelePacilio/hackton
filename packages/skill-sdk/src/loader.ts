import type { SkillDefinition } from "./types.js";

import focusSemanticFieldData from "../registry/focus_semantic_field.json";
import fillFieldData from "../registry/fill_field.json";
import readElementData from "../registry/read_element.json";
import readRegionData from "../registry/read_region.json";
import readErrorsData from "../registry/read_errors.json";
import navigateToIntentData from "../registry/navigate_to_intent.json";
import restoreFocusData from "../registry/restore_focus.json";
import injectFieldProxyData from "../registry/inject_field_proxy.json";
import injectStepperData from "../registry/inject_stepper.json";
import injectChoiceListData from "../registry/inject_choice_list.json";
import injectCommandPaletteData from "../registry/inject_command_palette.json";
import injectRouteNavigationData from "../registry/inject_route_navigation.json";
import replaceDragData from "../registry/replace_drag.json";
import replaceHoverData from "../registry/replace_hover.json";
import increaseTargetSizeData from "../registry/increase_target_size.json";
import simplifyInteractionData from "../registry/simplify_interaction.json";
import announceData from "../registry/announce.json";
import listenData from "../registry/listen.json";
import speakData from "../registry/speak.json";
import verifyFieldValueData from "../registry/verify_field_value.json";
import verifyActionResultData from "../registry/verify_action_result.json";
import verifyNavigationData from "../registry/verify_navigation.json";

const ALL_SKILLS: SkillDefinition[] = [
  focusSemanticFieldData as unknown as SkillDefinition,
  fillFieldData as unknown as SkillDefinition,
  readElementData as unknown as SkillDefinition,
  readRegionData as unknown as SkillDefinition,
  readErrorsData as unknown as SkillDefinition,
  navigateToIntentData as unknown as SkillDefinition,
  restoreFocusData as unknown as SkillDefinition,
  injectFieldProxyData as unknown as SkillDefinition,
  injectStepperData as unknown as SkillDefinition,
  injectChoiceListData as unknown as SkillDefinition,
  injectCommandPaletteData as unknown as SkillDefinition,
  injectRouteNavigationData as unknown as SkillDefinition,
  replaceDragData as unknown as SkillDefinition,
  replaceHoverData as unknown as SkillDefinition,
  increaseTargetSizeData as unknown as SkillDefinition,
  simplifyInteractionData as unknown as SkillDefinition,
  announceData as unknown as SkillDefinition,
  listenData as unknown as SkillDefinition,
  speakData as unknown as SkillDefinition,
  verifyFieldValueData as unknown as SkillDefinition,
  verifyActionResultData as unknown as SkillDefinition,
  verifyNavigationData as unknown as SkillDefinition,
];

const _registry = new Map<string, SkillDefinition>(
  ALL_SKILLS.map((s) => [s.id, s])
);

export const SKILL_REGISTRY: ReadonlyMap<string, SkillDefinition> = _registry;

export function get(id: string): SkillDefinition | undefined {
  return _registry.get(id);
}

export function list(): SkillDefinition[] {
  return [..._registry.values()];
}
