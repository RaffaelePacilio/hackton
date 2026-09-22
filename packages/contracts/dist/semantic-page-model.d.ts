export declare const SEMANTIC_MODEL_VERSION: "1.0.0";
export type ElementId = string;
export interface SemanticElement {
    id: ElementId;
    role: string;
    accessibleName: string;
    probableBusinessIntent?: string;
    requiredCapabilities: string[];
    visible: boolean;
    focusable: boolean;
    geometry: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    state?: Record<string, string | number | boolean>;
    validation?: {
        valid: boolean;
        messages?: string[];
    };
    relationships?: {
        labelledBy?: ElementId[];
        describedBy?: ElementId[];
        controls?: ElementId[];
        formOwner?: ElementId;
    };
    sensitive: boolean;
    confidence: number;
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
    modelId: string;
    generation: number;
}
//# sourceMappingURL=semantic-page-model.d.ts.map