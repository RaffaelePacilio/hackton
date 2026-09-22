// index.ts — public surface of the SemanticPageModel builder (WP-007).

export { SemanticModelBuilder, classifyBucket } from "./builder.js";
export { makeElementId, computeStructuralPath } from "./identity.js";
export { inferRole, inferAccessibleName } from "./role-inference.js";
export { inferRequiredCapabilities, isNativelyFocusable } from "./capability-inference.js";
export { isSensitive } from "./sensitivity.js";
export { extractRelationships } from "./relationships.js";
