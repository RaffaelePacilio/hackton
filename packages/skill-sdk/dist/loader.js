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
const ALL_SKILLS = [
    focusSemanticFieldData,
    fillFieldData,
    readElementData,
    readRegionData,
    readErrorsData,
    navigateToIntentData,
    restoreFocusData,
    injectFieldProxyData,
    injectStepperData,
    injectChoiceListData,
    injectCommandPaletteData,
    injectRouteNavigationData,
    replaceDragData,
    replaceHoverData,
    increaseTargetSizeData,
    simplifyInteractionData,
    announceData,
    listenData,
    speakData,
    verifyFieldValueData,
    verifyActionResultData,
    verifyNavigationData,
];
const _registry = new Map(ALL_SKILLS.map((s) => [s.id, s]));
export const SKILL_REGISTRY = _registry;
export function get(id) {
    return _registry.get(id);
}
export function list() {
    return [..._registry.values()];
}
//# sourceMappingURL=loader.js.map