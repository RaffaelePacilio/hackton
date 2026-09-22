import type { SemanticElement, SemanticPageModel } from "./semantic-page-model.js";

function redactElement(el: SemanticElement): SemanticElement {
  if (!el.sensitive) return el;
  // Strip all state fields; preserve only whether any value was present.
  // Object.keys check covers both undefined and empty-object cases.
  const hasValue =
    el.state !== undefined && Object.keys(el.state).length > 0;
  const { state: _stripped, ...rest } = el;
  return { ...rest, state: { hasValue } };
}

export function redact(model: SemanticPageModel): SemanticPageModel {
  const r = redactElement;
  return {
    ...model,
    regions:    model.regions.map(r),
    forms:      model.forms.map(r),
    navigation: model.navigation.map(r),
    actions:    model.actions.map(r),
    dialogs:    model.dialogs.map(r),
    errors:     model.errors.map(r),
  };
}
