// TODO SYNC-1: replace with import from @aua/contracts
// Frozen schema verbatim from aua/docs/contracts/interaction-contract.md v1.0.0

export const INTERACTION_CONTRACT_VERSION = "1.0.0" as const;

export type Availability = "available" | "unavailable" | "unknown" | "difficult";

export interface InteractionContract {
  version: typeof INTERACTION_CONTRACT_VERSION;
  contractId: string;
  updatedAt: string; // ISO-8601
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

export const DEFAULT_CONTRACT: InteractionContract = {
  version: INTERACTION_CONTRACT_VERSION,
  contractId: "",
  updatedAt: "",
  input: {
    keyboard: "unknown",
    pointer: "unknown",
    touch: "unknown",
    voice: "unknown",
    switch: "unknown",
  },
  actions: {
    drag: "unknown",
    precisionTargeting: "unknown",
    complexShortcuts: "unknown",
  },
  perception: {
    smallText: "unknown",
  },
  preferences: {
    largeTargets: false,
    linearNavigation: false,
    reducedMotion: false,
    spokenFeedback: false,
    confirmBeforeAction: true,
  },
};

export function isAvailability(value: unknown): value is Availability {
  return (
    value === "available" ||
    value === "unavailable" ||
    value === "unknown" ||
    value === "difficult"
  );
}

export function isValidContract(raw: unknown): raw is InteractionContract {
  if (typeof raw !== "object" || raw === null) return false;
  const c = raw as Record<string, unknown>;

  if (c["version"] !== INTERACTION_CONTRACT_VERSION) return false;
  if (typeof c["contractId"] !== "string") return false;
  if (typeof c["updatedAt"] !== "string") return false;

  const input = c["input"] as Record<string, unknown> | undefined;
  if (!input) return false;
  for (const key of ["keyboard", "pointer", "touch", "voice", "switch"] as const) {
    if (!isAvailability(input[key])) return false;
  }

  const actions = c["actions"] as Record<string, unknown> | undefined;
  if (!actions) return false;
  for (const key of ["drag", "precisionTargeting", "complexShortcuts"] as const) {
    if (!isAvailability(actions[key])) return false;
  }

  const perception = c["perception"] as Record<string, unknown> | undefined;
  if (!perception) return false;
  if (!isAvailability(perception["smallText"])) return false;
  if ("colorContrast" in perception && !isAvailability(perception["colorContrast"])) return false;
  if ("motion" in perception && !isAvailability(perception["motion"])) return false;

  const prefs = c["preferences"] as Record<string, unknown> | undefined;
  if (!prefs) return false;
  for (const key of ["largeTargets", "linearNavigation", "reducedMotion", "spokenFeedback"] as const) {
    if (typeof prefs[key] !== "boolean") return false;
  }

  return true;
}
