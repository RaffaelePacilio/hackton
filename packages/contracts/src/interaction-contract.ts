export const INTERACTION_CONTRACT_VERSION = "1.0.0" as const;

export type Availability = "available" | "unavailable" | "unknown" | "difficult";

export interface InteractionContract {
  version: typeof INTERACTION_CONTRACT_VERSION;
  contractId: string;         // stable per-user identifier, opaque
  updatedAt: string;          // ISO-8601
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
    confirmBeforeAction?: boolean; // default true for WRITE_PERSONAL_DATA+ per ADR-014
  };
}
