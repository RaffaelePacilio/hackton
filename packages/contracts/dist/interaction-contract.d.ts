export declare const INTERACTION_CONTRACT_VERSION: "1.0.0";
export type Availability = "available" | "unavailable" | "unknown" | "difficult";
export interface InteractionContract {
    version: typeof INTERACTION_CONTRACT_VERSION;
    contractId: string;
    updatedAt: string;
    input: {
        keyboard: Availability;
        pointer: Availability;
        touch: Availability;
        voice: Availability;
        switch: Availability;
    };
    actions: {
        drag: Availability;
        precisionTargeting: Availability;
        complexShortcuts: Availability;
    };
    perception: {
        smallText: Availability;
        colorContrast?: Availability;
        motion?: Availability;
    };
    preferences: {
        largeTargets: boolean;
        linearNavigation: boolean;
        reducedMotion: boolean;
        spokenFeedback: boolean;
        confirmBeforeAction?: boolean;
    };
}
//# sourceMappingURL=interaction-contract.d.ts.map