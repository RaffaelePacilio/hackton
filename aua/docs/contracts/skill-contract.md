# Contract: Skill Definition & Invocation — v1.0.0 (FROZEN)

Owner package: `packages/skill-sdk`. This is the **only** execution surface available to the
Adaptation Planner. No package may execute arbitrary DOM/JS strings produced by an LLM.

## TypeScript

```typescript
export type CapabilityClass =
  | "READ" | "FOCUS" | "NAVIGATE" | "WRITE_LOW_RISK"
  | "WRITE_PERSONAL_DATA" | "SUBMIT" | "AUTHENTICATE" | "PAYMENT" | "DESTRUCTIVE";

export interface SkillDefinition {
  id: string;                 // e.g. "fill_field"
  version: string;            // semver
  purpose: string;
  inputSchema: object;        // JSON Schema
  preconditions: string[];
  permissions: CapabilityClass[];
  sideEffects: string[];
  outputSchema: object;
  errorModel: { code: string; retryable: boolean }[];
  rollback: "supported" | "not-applicable" | "manual-only";
  verificationStrategy: string; // reference to a Verification Engine check
  telemetry: { emits: string[] };
  securityClassification: CapabilityClass;
}

export interface SkillInvocation {
  invocationId: string;
  skillId: string;
  skillVersion: string;
  targetElementId?: string; // SemanticElement.id
  inputs: Record<string, unknown>;
  requestedBy: "agent" | "deterministic-rule" | "user-direct";
  interactionId: string;    // correlation
}

export interface SkillResult {
  invocationId: string;
  status: "success" | "failed" | "requires-confirmation" | "rolled-back";
  output?: Record<string, unknown>;
  errorCode?: string;
  verification?: VerificationResult;
}

export interface VerificationResult {
  invocationId: string;
  verified: boolean;
  method: "dom-read" | "route-check" | "state-diff" | "accessibility-check";
  observedValue?: unknown;
  expectedValue?: unknown;
  failureClass?: "timeout" | "mismatch" | "element-gone" | "framework-blocked";
}
```

## Confirmation policy (binding, enforced in the Skill Executor, not the Planner)

| Capability class | Execution mode |
|---|---|
| READ, FOCUS, NAVIGATE | Automatic |
| WRITE_LOW_RISK | Automatic, always verified post-hoc |
| WRITE_PERSONAL_DATA | Automatic with visible/audible pre-announcement; user may configure `confirmBeforeAction: true` |
| SUBMIT | Confirmation required by default |
| AUTHENTICATE, PAYMENT | Explicit confirmation **every time**, no "remember my choice" |
| DESTRUCTIVE | Prohibited unless the target skill explicitly declares `rollback: "supported"` **and** confirmation is given |

## Baseline Skill Registry (v1.0.0)

`focus_semantic_field`, `fill_field`, `read_element`, `read_region`, `read_errors`,
`navigate_to_intent`, `restore_focus`, `inject_field_proxy`, `inject_stepper`,
`inject_choice_list`, `inject_command_palette`, `inject_route_navigation`, `replace_drag`,
`replace_hover`, `increase_target_size`, `simplify_interaction`, `announce`, `listen`, `speak`,
`verify_field_value`, `verify_action_result`, `verify_navigation`.

Each ships as a versioned entry in `packages/skill-sdk/registry/*.json` conforming exactly to
`SkillDefinition` above. Adding a skill is additive and does not require a contract version
bump; changing an existing skill's `inputSchema` in a breaking way does.
