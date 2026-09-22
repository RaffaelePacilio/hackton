export const SEMANTIC_MODEL_VERSION = "1.0.0" as const;

export type ElementId = string; // stable across mutations of the *same* logical element

export interface SemanticElement {
  id: ElementId;
  role: string;                    // ARIA role or inferred equivalent
  accessibleName: string;
  probableBusinessIntent?: string; // e.g. "phone-number", "set-max-price"
  requiredCapabilities: string[];  // e.g. ["pointer","drag"]
  visible: boolean;
  focusable: boolean;
  geometry: { x: number; y: number; width: number; height: number };
  state?: Record<string, string | number | boolean>;
  validation?: { valid: boolean; messages?: string[] };
  relationships?: {
    labelledBy?: ElementId[];
    describedBy?: ElementId[];
    controls?: ElementId[];
    formOwner?: ElementId;
  };
  sensitive: boolean;   // password/payment/auth heuristic — excludes value from upstream payloads
  confidence: number;   // 0..1
  provenance: "dom" | "aria" | "heuristic" | "framework-adapter";
}

export interface SemanticPageModel {
  version: typeof SEMANTIC_MODEL_VERSION;
  page: {
    url: string;
    title: string;
    route: string;
    mainIntent?: string;
    capturedAt: string;
  };
  regions: SemanticElement[];
  forms: SemanticElement[];
  navigation: SemanticElement[];
  actions: SemanticElement[];
  dialogs: SemanticElement[];
  errors: SemanticElement[];
  visibleElements: ElementId[];
  modelId: string;     // increments per rebuild/diff generation
  generation: number;
}
