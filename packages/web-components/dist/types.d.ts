export type MountPoint = "adjacent" | "overlay";
export interface AdaptationConfig {
    skillId: string;
    mountPoint: MountPoint;
    zIndexStrategy: "isolated-stacking-context";
}
export interface AccessibilityAdapter {
    /** SemanticElement.id of the original control this adapter proxies. */
    targetElementId: string;
    semanticIntent: string;
    adaptationConfig: AdaptationConfig;
}
export type LifecycleEventType = "aua:mount" | "aua:unmount" | "aua:rebind";
export interface LifecycleEventDetail {
    targetElementId: string;
    elementTag: string;
    timestamp: number;
}
//# sourceMappingURL=types.d.ts.map