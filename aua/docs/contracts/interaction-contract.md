# Contract: InteractionContract — v1.0.0 (FROZEN)

Owner package: `packages/interaction-contract`. Consumers: everything. Producers: Universal
Accessibility Bootstrap only.

## Invariants

- Never contains a medical/diagnostic field. Adding one is an architecture violation requiring
  a dedicated change-control ADR, not a routine PR.
- Fully user-editable at any time from the Bootstrap UI, independent of LLM/backend
  availability.
- Versioned; consumers must reject unknown major versions rather than guess defaults.

## TypeScript

```typescript
export const INTERACTION_CONTRACT_VERSION = "1.0.0" as const;

export type Availability = "available" | "unavailable" | "unknown" | "difficult";

export interface InteractionContract {
  version: typeof INTERACTION_CONTRACT_VERSION;
  contractId: string;          // stable per-user identifier, opaque
  updatedAt: string;           // ISO-8601
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
```

## JSON Schema (excerpt, for runtime validation)

```json
{
  "$id": "https://aua.dev/schemas/interaction-contract-1.0.0.json",
  "type": "object",
  "required": ["version", "contractId", "updatedAt", "input", "actions", "perception", "preferences"],
  "properties": {
    "version": { "const": "1.0.0" },
    "input": {
      "type": "object",
      "properties": {
        "keyboard": { "$ref": "#/definitions/availability" },
        "pointer": { "$ref": "#/definitions/availability" },
        "touch": { "$ref": "#/definitions/availability" },
        "voice": { "$ref": "#/definitions/availability" },
        "switch": { "$ref": "#/definitions/availability" }
      },
      "required": ["keyboard", "pointer", "touch", "voice", "switch"]
    }
  },
  "definitions": {
    "availability": { "enum": ["available", "unavailable", "unknown", "difficult"] }
  }
}
```

## Change control

Any field addition/removal is a **minor/major** version bump respectively. Consumers pin a
supported version range. The Contracts package (`packages/contracts`) is the only place this
type may be edited — see Parallel Agent Rule #2.
