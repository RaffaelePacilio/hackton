# Contract: SemanticPageModel — v1.0.0 (FROZEN)

Owner package: `packages/semantic-model`. Producer: Browser Extension runtime. Consumers:
Barrier Engine, Intent Engine, Adaptation Planner, Agent Orchestration Service (redacted view
only).

## Design decision (see ADR-003 for full rationale)

Internal representation: **hybrid graph/tree**. Tree for DOM containment / landmark structure
(cheap incremental diff on mutation), graph for cross-references that are not tree-shaped
(`labelledBy`, `describedBy`, `formOwner`, `controls`). Serialized form sent off-runtime is a
flattened, redacted, token-budgeted JSON projection — never the internal graph object itself.

## TypeScript

```typescript
export const SEMANTIC_MODEL_VERSION = "1.0.0" as const;

export type ElementId = string; // stable across mutations of the *same* logical element

export interface SemanticElement {
  id: ElementId;
  role: string;                     // ARIA role or inferred equivalent
  accessibleName: string;
  probableBusinessIntent?: string;  // e.g. "phone-number", "set-max-price"
  requiredCapabilities: string[];   // e.g. ["pointer","drag"]
  visible: boolean;
  focusable: boolean;
  geometry: { x: number; y: number; width: number; height: number };
  state?: Record<string, string | number | boolean>;
  validation?: { valid: boolean; messages?: string[] };
  relationships?: { labelledBy?: ElementId[]; describedBy?: ElementId[]; controls?: ElementId[]; formOwner?: ElementId };
  sensitive: boolean;                // password/payment/auth heuristic — excludes value from upstream payloads
  confidence: number;                // 0..1
  provenance: "dom" | "aria" | "heuristic" | "framework-adapter";
}

export interface SemanticPageModel {
  version: typeof SEMANTIC_MODEL_VERSION;
  page: { url: string; title: string; route: string; mainIntent?: string; capturedAt: string };
  regions: SemanticElement[];
  forms: SemanticElement[];
  navigation: SemanticElement[];
  actions: SemanticElement[];
  dialogs: SemanticElement[];
  errors: SemanticElement[];
  visibleElements: ElementId[];
  modelId: string;      // increments per rebuild/diff generation
  generation: number;
}
```

## Redaction rule (enforced at the serialization boundary, not by convention)

Any `SemanticElement` with `sensitive: true` MUST have `state` stripped to
`{ hasValue: boolean }` before leaving the browser extension process. This is implemented once,
in `packages/semantic-model/src/redact.ts`, and is a **shared, frozen** function — no consumer
package may bypass it.

## Lifecycle

- **Creation**: full build on initial page load / SPA route change.
- **Update**: `MutationObserver`-driven incremental diff, producing `PageMutationEvent`s that
  patch the existing graph rather than rebuilding.
- **Invalidation**: route change, full-document mutation storm exceeding a threshold (fallback
  to full rebuild), or explicit `invalidate()` call from the Routing Layer.
- **Caching**: last-known-good model retained during rebuild to avoid a blank window for the
  Barrier Engine.
