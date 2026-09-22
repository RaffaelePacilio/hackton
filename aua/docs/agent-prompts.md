# Parallel Agent Implementation Prompts

Each section below is a self-contained prompt to paste into a Claude Code agent.
All 20 prompts are designed to run concurrently — they target disjoint parts of the codebase.

---

## AGENT-001 — Runtime Topology: Extension/Backend Boundary

```
You are implementing the runtime boundary infrastructure for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-001 decision: the browser extension owns all DOM work (SemanticPageModel, skill execution, verification); the backend owns all LLM reasoning (Session Gateway → Agent Orchestration Service). These communicate over a typed message protocol — the extension never sends raw DOM to the backend, only redacted SemanticPageModel slices.

Your task — implement the shared message-envelope contract and transport stubs:

1. Create packages/shared/src/protocol/messages.ts
   Define and export these TypeScript types:
   - MessageEnvelope<T>: { version: string; sessionId: string; pageId: string; timestamp: number; payload: T }
   - ExtensionToBackendMessage: union of AdaptationRequest | HealthCheckRequest | AuditEventBatch
   - BackendToExtensionMessage: union of AdaptationResponse | HealthCheckResponse | DegradedModeSignal
   - AdaptationRequest: { type: "adaptation-request"; barrier: import from ../barrier; redactedSlice: import from ../semantic }
   - AdaptationResponse: { type: "adaptation-response"; plan: AdaptationPlan | null; degraded: boolean; failureReason?: string }
   - DegradedModeSignal: { type: "degraded-mode"; reason: "provider-unavailable" | "backend-unreachable" | "rate-limited" }
   All types must be JSON-serializable (no functions, no class instances).

2. Create packages/shared/src/protocol/transport.ts
   Define interface BackendTransport:
     send(msg: ExtensionToBackendMessage): Promise<BackendToExtensionMessage>
     isAvailable(): Promise<boolean>
   Export a createNullTransport(): BackendTransport that always returns a DegradedModeSignal (used in tests and offline mode).

3. Create packages/shared/src/protocol/index.ts re-exporting everything.

4. Add packages/shared/package.json with name "@aua/shared", version "0.1.0", main "src/index.ts", and a top-level packages/shared/src/index.ts that re-exports from protocol/index.ts.

5. Write unit tests at packages/shared/src/__tests__/messages.test.ts:
   - Verify MessageEnvelope is correctly typed (compile-time, use tsc --noEmit style assertions).
   - Verify createNullTransport always returns DegradedModeSignal.

Do not implement the actual HTTP/WebSocket transport — that belongs to the Session Gateway agent (AGENT-020). Do not touch any DOM code. Stay within packages/shared/.
```

---

## AGENT-002 — Browser Extension: Manifest, Service Worker, Content Script Scaffold

```
You are implementing the browser extension scaffold for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-002 decision: Manifest V3, three layers — content script (isolated world, DOM read + MutationObserver), page-context bridge (injected narrowly scoped script, communicates via origin-checked postMessage), service worker (session lifecycle, backend comms, skill cache). Minimum permissions: activeTab, scripting, storage. Host permissions are optional/incremental.

Your task:

1. Create packages/extension/manifest.json (MV3):
   - manifest_version: 3
   - name: "AUA Accessibility Assistant", version: "0.1.0"
   - permissions: ["activeTab", "scripting", "storage"]
   - optional_host_permissions: ["<all_urls>"]
   - background: { service_worker: "background/service-worker.js", type: "module" }
   - content_scripts: [{ matches: ["<all_urls>"], js: ["content/content-script.js"], run_at: "document_idle", all_frames: false }]
   - web_accessible_resources: [{ resources: ["content/page-bridge.js"], matches: ["<all_urls>"] }]

2. Create packages/extension/src/background/service-worker.ts:
   - Import BackendTransport from @aua/shared
   - Export a ServiceWorkerSession class with: sessionId (uuid), install() / activate() / handleMessage(msg) stubs
   - Register chrome.runtime.onMessage listener routing messages to handleMessage
   - Add a DEGRADED_MODE boolean flag, set to true when BackendTransport.isAvailable() returns false
   - No actual HTTP yet — use createNullTransport() for now

3. Create packages/extension/src/content/content-script.ts:
   - Set up a MutationObserver on document.body (subtree, childList, attributes)
   - On each mutation batch call a stub buildSemanticModel() (returns void for now)
   - Intercept history.pushState/replaceState via a page-context bridge injection:
     inject packages/extension/src/content/page-bridge.ts as a script tag with src from chrome.runtime.getURL
   - Listen for window.postMessage with { origin: window.location.origin, type: "AUA_ROUTE_CHANGE" }
   - All postMessage sends must include { auaVersion: "1" } in the envelope

4. Create packages/extension/src/content/page-bridge.ts:
   - Monkey-patch history.pushState and history.replaceState
   - On each call, post { type: "AUA_ROUTE_CHANGE", auaVersion: "1", url: args[2] } to window with targetOrigin: window.location.origin
   - Never use eval

5. Create packages/extension/package.json: name "@aua/extension", version "0.1.0"

6. Write a Jest unit test at packages/extension/src/__tests__/page-bridge.test.ts verifying that after patching, pushState posts the expected message structure.

Stay within packages/extension/. Do not implement SemanticPageModel or skills yet.
```

---

## AGENT-003 — Semantic Page Model: Core Types, Builder, and Redaction

```
You are implementing the SemanticPageModel for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-003 decision: Internal model is a DOM-shaped tree augmented with a relationship graph (labelledBy/describedBy/controls/formOwner edges). External/serialized form is a flat, redacted JSON projection. Element identity is a stable composite key. Redaction is enforced at serialization, not by consumer discipline — this is the single most safety-critical function and requires 100% branch test coverage.

Your task — implement packages/semantic-model/:

1. packages/semantic-model/src/types.ts
   Export:
   - ElementId: branded string type `type ElementId = string & { __brand: "ElementId" }`
   - SemanticRole: union of "region" | "form" | "navigation" | "action" | "dialog" | "error" | "heading" | "input" | "button" | "link" | "text" | "unknown"
   - RelationshipKind: "labelledBy" | "describedBy" | "controls" | "formOwner"
   - SensitiveFlag: { sensitive: true; valueRedacted: true } | { sensitive: false }
   - SemanticElement: { id: ElementId; role: SemanticRole; accessibleName: string; visible: boolean; sensitive: boolean; value?: string } & SensitiveFlag
   - SemanticRelationship: { from: ElementId; to: ElementId; kind: RelationshipKind }
   - SemanticPageModel: { sessionId: string; pageId: string; url: string; title: string; elements: SemanticElement[]; relationships: SemanticRelationship[]; redacted: true }
   Note: SemanticPageModel always has redacted: true — it is the post-serialization form.

2. packages/semantic-model/src/element-id.ts
   Export makeElementId(path: string, role: SemanticRole, name: string, disambiguator: number): ElementId
   Use: `${path}|${role}|${name}|${disambiguator}` as the stable composite key.

3. packages/semantic-model/src/redact.ts — THE SAFETY-CRITICAL FILE
   Export redactElement(el: Omit<SemanticElement, keyof SensitiveFlag> & { sensitive: boolean; value?: string }): SemanticElement
   Rules (every branch must be tested):
   - If sensitive === true: return element with sensitive: true, valueRedacted: true, and value STRIPPED (undefined)
   - If sensitive === false and value present: return element with sensitive: false, value intact
   - If sensitive === false and no value: return element with sensitive: false, no value field
   Export redactModel(raw: Omit<SemanticPageModel, "redacted">): SemanticPageModel
   Calls redactElement on every element, sets redacted: true.
   This function must never throw; malformed input returns a model with elements: [].

4. packages/semantic-model/src/builder.ts
   Export a SemanticModelBuilder class:
   - addElement(el: ...) / removeElement(id: ElementId) / addRelationship(...) / removeRelationship(...)
   - build(): SemanticPageModel — calls redactModel internally, always returns a redacted model
   - The internal tree is a Map<ElementId, SemanticElement>; relationships are a Set<SemanticRelationship>

5. packages/semantic-model/src/__tests__/redact.test.ts
   MUST achieve 100% branch coverage on redact.ts:
   - sensitive input strips value
   - non-sensitive input with value preserves value
   - non-sensitive input without value has no value field
   - malformed input does not throw
   - redacted: true is always set on output model

6. packages/semantic-model/package.json: name "@aua/semantic-model", version "0.1.0"

Do not implement DOM traversal here — that belongs to the extension agent. Stay within packages/semantic-model/.
```

---

## AGENT-004 — Interaction Contract: Schema, Validation, and Bootstrap UI

```
You are implementing the Interaction Contract for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-004 decision: a user-owned, explicitly-declared (never inferred) description of capabilities and preferences. Editable only through the Universal Accessibility Bootstrap, which must work without backend/LLM. Unknown fields default to "unknown" — treated conservatively as no barrier assumed. The system must never infer medical conditions from interaction patterns.

Your task — implement packages/interaction-contract/:

1. packages/interaction-contract/src/types.ts
   Export:
   - CapabilityLevel: "full" | "partial" | "none" | "unknown"
   - CapabilityClass: "READ" | "NAVIGATE" | "INTERACT" | "SUBMIT" | "AUTHENTICATE" | "PAYMENT" | "DESTRUCTIVE"
   - InteractionContract: {
       version: "1.0.0";
       userId?: string;
       capabilities: {
         motor: CapabilityLevel;
         vision: CapabilityLevel;
         hearing: CapabilityLevel;
         cognitive: CapabilityLevel;
       };
       preferences: {
         confirmBeforeAction: boolean;
         voiceEnabled: boolean;
         highContrast: boolean;
         reducedMotion: boolean;
         fontSize: "default" | "large" | "xlarge";
       };
       capabilityClassOverrides?: Partial<Record<CapabilityClass, "require-confirm" | "allow" | "block">>;
       createdAt: string; // ISO-8601
       updatedAt: string; // ISO-8601
     }
   - DEFAULT_CONTRACT: InteractionContract with all capabilities "unknown", confirmBeforeAction: true, voiceEnabled: false

2. packages/interaction-contract/src/validate.ts
   Export validateContract(raw: unknown): { valid: true; contract: InteractionContract } | { valid: false; errors: string[] }
   Validate: version is "1.0.0", all capability fields are valid CapabilityLevel values, preferences types are correct, dates are ISO-8601 strings. Return errors array, never throw.

3. packages/interaction-contract/src/storage.ts
   Export:
   - loadContract(): Promise<InteractionContract> — reads from chrome.storage.local key "aua_contract"; returns DEFAULT_CONTRACT if absent or invalid
   - saveContract(c: InteractionContract): Promise<void> — validates before saving, rejects if invalid
   Mock chrome.storage.local if not in a browser context (use typeof chrome !== "undefined" guard).

4. packages/interaction-contract/src/bootstrap.ts
   Export a buildBootstrapHtml(contract: InteractionContract): string function that returns a self-contained HTML string for the Universal Accessibility Bootstrap UI panel:
   - A form with fields for each capability (dropdowns: full/partial/none/unknown)
   - Checkboxes for preferences (confirmBeforeAction, voiceEnabled, highContrast, reducedMotion)
   - Font size selector
   - Submit button that posts { type: "AUA_CONTRACT_SAVE", contract } via postMessage
   - No external dependencies — pure HTML/CSS/vanilla JS inline
   - Must be functional without internet access or backend

5. packages/interaction-contract/src/__tests__/validate.test.ts
   Test: valid contract passes, missing fields fail, invalid capability values fail, invalid dates fail, DEFAULT_CONTRACT passes validation.

6. packages/interaction-contract/package.json: name "@aua/interaction-contract", version "1.0.0"

Do not infer capabilities from behavior. Do not add any telemetry here. Stay within packages/interaction-contract/.
```

---

## AGENT-005 — Agent Orchestration: Browser-Runtime Custom Orchestrator

```
You are implementing the browser-side agent orchestrator for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-005 decision: Browser-runtime barrier→plan reasoning uses a thin CUSTOM orchestrator (no framework). A single, tightly-scoped LLM call per unresolved barrier. The backend uses LangGraph for stateful flows (separate agent). In production, only two roles are true LLM agents: Adaptation Reasoning and Voice Realtime Agent.

Your task — implement packages/agent-runtime/src/orchestrator/:

1. packages/agent-runtime/src/types.ts
   Export:
   - Barrier: { id: string; elementId: string; barrierType: string; severity: "low" | "medium" | "high" | "unknown"; description: string }
   - AdaptationPlan: { barrierId: string; steps: AdaptationStep[]; confidence: number }
   - AdaptationStep: { skillId: string; inputs: Record<string, unknown> }
   - AgentDecision: { type: "execute-plan"; plan: AdaptationPlan } | { type: "confirm-with-user"; topCandidates: AdaptationPlan[]; reason: string } | { type: "degraded-mode"; reason: string }
   - OrchestratorConfig: { minConfidenceFloor: number; disambiguationThreshold: number } — defaults 0.6 and 0.15

2. packages/agent-runtime/src/orchestrator/browser-orchestrator.ts
   Export class BrowserOrchestrator:
   - constructor(provider: ReasoningProvider, config?: Partial<OrchestratorConfig>)
   - async resolveBarrier(barrier: Barrier, slice: RedactedSemanticSlice): Promise<AgentDecision>
     Logic:
     a. Call provider.planAdaptation({ barrier, context: slice })
     b. If provider throws/times out → return { type: "degraded-mode", reason: "provider-unavailable" }
     c. If plan.confidence < minConfidenceFloor → return { type: "degraded-mode", reason: "low-confidence" }
     d. Also call provider.planAdaptation a second time to get a second candidate (simulate disambiguation check)
     e. If |plan1.confidence - plan2.confidence| < disambiguationThreshold → return { type: "confirm-with-user", topCandidates: [plan1, plan2], reason: "ambiguous-targets" }
     f. Return { type: "execute-plan", plan: topCandidate }
   Note: import ReasoningProvider from @aua/ai-provider (stub the import with `// TODO: replace with real provider` if the package doesn't exist yet — do not block)

3. packages/agent-runtime/src/orchestrator/index.ts re-exporting BrowserOrchestrator and types.

4. packages/agent-runtime/src/__tests__/browser-orchestrator.test.ts
   Mock ReasoningProvider. Test:
   - provider error → degraded-mode
   - confidence below floor → degraded-mode
   - two candidates within threshold → confirm-with-user
   - clear winner → execute-plan

5. packages/agent-runtime/package.json: name "@aua/agent-runtime", version "0.1.0"

Do not implement LangGraph here. Do not call any real LLM API. Stay within packages/agent-runtime/.
```

---

## AGENT-006 — AI Provider Abstraction: ReasoningProvider Interface and Adapters

```
You are implementing the AI provider abstraction layer for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-006 decision: Define a ReasoningProvider interface in packages/agent-runtime. Concrete adapters per vendor. Orchestration Service selects via config with a fallback chain (primary → secondary → rule-only degraded mode). Structured output required at the adapter boundary. Only the redacted SemanticPageModel slice ever crosses this interface.

Your task — implement packages/ai-provider/:

1. packages/ai-provider/src/types.ts
   Export:
   - RedactedSemanticSlice: { elements: Array<{ id: string; role: string; accessibleName: string; visible: boolean; sensitive: boolean }>; relationships: Array<{ from: string; to: string; kind: string }> }
   - Barrier: re-export from @aua/agent-runtime (or duplicate the minimal type if circular)
   - AdaptationPlan: re-export similarly
   - UserIntent: { intentType: "navigate" | "fill-form" | "click" | "query" | "voice-command"; targetElementId?: string; parameters?: Record<string, unknown>; rawUtterance?: string }
   - ReasoningProvider interface:
       name: string
       planAdaptation(input: { barrier: Barrier; context: RedactedSemanticSlice }): Promise<AdaptationPlan>
       resolveIntent(input: { utterance: string; context: RedactedSemanticSlice }): Promise<UserIntent>
       summarizePage(input: { context: RedactedSemanticSlice }): Promise<string>
       healthCheck(): Promise<boolean>

2. packages/ai-provider/src/adapters/null-provider.ts
   Export NullProvider implements ReasoningProvider:
   - name: "null"
   - planAdaptation: always returns { barrierId: barrier.id, steps: [], confidence: 0 }
   - resolveIntent: always returns { intentType: "query" }
   - summarizePage: always returns ""
   - healthCheck: always returns false
   Used for offline/degraded mode and tests.

3. packages/ai-provider/src/adapters/stub-provider.ts
   Export StubProvider implements ReasoningProvider:
   - name: "stub"
   - Constructor accepts a Map<string, AdaptationPlan> for deterministic test responses
   - planAdaptation: looks up barrier.id in the map, returns the plan or a default confidence-0 plan
   - healthCheck: always returns true
   Used for unit tests and CI.

4. packages/ai-provider/src/provider-chain.ts
   Export class ProviderChain implements ReasoningProvider:
   - Constructor accepts providers: ReasoningProvider[] (ordered primary→secondary)
   - name: "chain"
   - planAdaptation: tries each provider in order; catches errors and moves to next; if all fail, returns NullProvider result
   - healthCheck: returns true if any provider is healthy

5. packages/ai-provider/src/__tests__/provider-chain.test.ts
   Test: first provider fails → falls back to second; all fail → null result; healthy check works.

6. packages/ai-provider/package.json: name "@aua/ai-provider", version "0.1.0"

Do not hardcode any API keys. Do not implement real HTTP calls to LLM vendors here — that is runtime configuration. Stay within packages/ai-provider/.
```

---

## AGENT-007 — Voice Architecture: SpeechProvider Interface and Dual-Mode Stubs

```
You are implementing the voice subsystem interfaces for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-007 decision: SpeechProvider interface implemented by two modes — realtime speech-to-speech (primary, low-latency) and chained-pipeline (fallback for data-residency/auditability). Automatic fallback chain: realtime → chained → browser/OS-native STT. If all fail, non-voice paths remain available.

Your task — implement packages/voice/:

1. packages/voice/src/types.ts
   Export:
   - SpeechMode: "realtime" | "chained"
   - SpeechSessionConfig: { sessionId: string; language: string; mode: SpeechMode; sampleRate?: number }
   - SpeechEvent: { type: "transcript"; text: string; isFinal: boolean; confidence: number } | { type: "error"; code: string; message: string } | { type: "end" }
   - SpeechSession: { id: string; mode: SpeechMode; config: SpeechSessionConfig; startedAt: number }
   - SpeechProvider interface:
       mode: SpeechMode
       startSession(config: SpeechSessionConfig): Promise<SpeechSession>
       transcribe(session: SpeechSession): AsyncIterable<SpeechEvent>
       synthesize(session: SpeechSession, text: string): AsyncIterable<Uint8Array>
       interrupt(sessionId: string): Promise<void>
       healthCheck(): Promise<boolean>

2. packages/voice/src/providers/null-speech-provider.ts
   NullSpeechProvider implements SpeechProvider:
   - mode: "chained"
   - startSession: returns a minimal SpeechSession
   - transcribe: yields a single { type: "end" } event
   - synthesize: yields a single empty Uint8Array
   - interrupt: no-op
   - healthCheck: false

3. packages/voice/src/providers/native-stt-provider.ts
   NativeSttProvider implements SpeechProvider (last-resort fallback using Web Speech API):
   - mode: "chained"
   - startSession: checks if window.SpeechRecognition or window.webkitSpeechRecognition exists; if not, throws Error("native-stt-unavailable")
   - transcribe: wraps SpeechRecognition events into AsyncIterable<SpeechEvent>
   - synthesize: wraps SpeechSynthesis.speak() into AsyncIterable<Uint8Array> (chunked audio not available — yield empty array and resolve)
   - interrupt: calls SpeechRecognition.stop()
   - healthCheck: returns typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)

4. packages/voice/src/speech-fallback-chain.ts
   Export class SpeechFallbackChain implements SpeechProvider:
   - Constructor accepts providers: SpeechProvider[] (realtime first, then chained, then native)
   - mode: first healthy provider's mode, else "chained"
   - Each method tries providers in order; on error moves to next
   - If all fail, returns/throws meaningful error without crashing the caller

5. packages/voice/src/__tests__/fallback-chain.test.ts
   Test: primary fails → uses secondary; all fail → NullSpeechProvider result; healthCheck logic.

6. packages/voice/package.json: name "@aua/voice", version "0.1.0"

Do not implement any real STT/TTS vendor HTTP calls — those are provider-specific adapters added later. Stay within packages/voice/.
```

---

## AGENT-008 — Skill Registry: SkillDefinition Schema, Registry, and Executor

```
You are implementing the Skill Registry for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-008 decision: a closed, versioned registry of SkillDefinitions. LLM output is constrained to { skillId, inputs } pairs validated against each skill's inputSchema before execution. New skills are added only via reviewed PR to packages/skill-sdk/registry/ — never dynamically at runtime. Unknown skillId → hard rejection, never fallback to generated code. Capability-class gating enforced in Executor, independent of what the Planner claims.

Your task — implement packages/skill-sdk/:

1. packages/skill-sdk/src/types.ts
   Export:
   - CapabilityClass: "READ" | "NAVIGATE" | "INTERACT" | "SUBMIT" | "AUTHENTICATE" | "PAYMENT" | "DESTRUCTIVE"
   - VerificationStrategy: { method: "dom-read" | "route-check" | "state-diff" | "accessibility-check"; expectedValue?: string; timeoutMs?: number }
   - SkillDefinition: {
       skillId: string;
       version: string;
       description: string;
       capabilityClass: CapabilityClass;
       inputSchema: object; // JSON Schema
       verificationStrategy?: VerificationStrategy;
       idempotent: boolean;
       rollback: "supported" | "not-supported";
     }
   - SkillInvocation: { skillId: string; inputs: Record<string, unknown>; sessionId: string; invocationId: string }
   - SkillResult: { invocationId: string; status: "success" | "failure"; failureClass?: "timeout" | "mismatch" | "element-gone" | "framework-blocked"; message?: string }

2. packages/skill-sdk/src/registry.ts
   Export class SkillRegistry:
   - private skills: Map<string, SkillDefinition>
   - register(def: SkillDefinition): void — throws if skillId already registered (immutable at runtime)
   - get(skillId: string): SkillDefinition | undefined
   - list(): SkillDefinition[]
   Export a GLOBAL_REGISTRY = new SkillRegistry() singleton.

3. packages/skill-sdk/registry/ — add these seed JSON skill definitions (one .json file each):
   - navigate_to_element.json: { skillId: "navigate_to_element", version: "1.0.0", capabilityClass: "NAVIGATE", inputSchema: { type: "object", properties: { elementId: { type: "string" } }, required: ["elementId"] }, idempotent: true, rollback: "not-supported" }
   - fill_field.json: { skillId: "fill_field", capabilityClass: "INTERACT", inputSchema: { type: "object", properties: { elementId: { type: "string" }, value: { type: "string" } }, required: ["elementId", "value"] }, idempotent: false, rollback: "not-supported" }
   - click_element.json: { skillId: "click_element", capabilityClass: "INTERACT", inputSchema: { ...elementId required... }, idempotent: false, rollback: "not-supported" }
   - inject_field_proxy.json: { skillId: "inject_field_proxy", capabilityClass: "READ", inputSchema: { ...elementId required... }, idempotent: true, rollback: "supported" }
   - submit_form.json: { skillId: "submit_form", capabilityClass: "SUBMIT", inputSchema: { ...formId required... }, idempotent: false, rollback: "not-supported" }

4. packages/skill-sdk/src/executor.ts
   Export class SkillExecutor:
   - constructor(registry: SkillRegistry, allowedClasses: CapabilityClass[])
   - validate(invocation: SkillInvocation): { valid: boolean; errors: string[] }
     - Checks skillId exists; validates inputs against skill's inputSchema using Ajv (install as dev dep)
     - Checks capabilityClass is in allowedClasses
   - execute(invocation: SkillInvocation): Promise<SkillResult>
     - Calls validate first; if invalid returns failureClass: "framework-blocked"
     - Otherwise calls performSkill(def, invocation) stub (returns success immediately for now)
     - Verification is always performed (stub returns success for now)

5. packages/skill-sdk/src/__tests__/executor.test.ts
   Test: unknown skillId → framework-blocked; invalid inputs → framework-blocked; disallowed capability class → framework-blocked; valid invocation → success.

6. packages/skill-sdk/package.json: name "@aua/skill-sdk", version "0.1.0", add ajv dependency.

Stay within packages/skill-sdk/. Do not implement actual DOM interaction in execute() — that is the Form Agent (AGENT-010).
```

---

## AGENT-009 — Web Component Adapters: a11y-field-proxy and a11y-live-region

```
You are implementing Web Component accessibility adapters for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-009 decision: injected Web Components are mounted in closed Shadow DOM roots alongside (not replacing) the original element. They bidirectionally synchronize state. Closed Shadow DOM for style isolation. CSS custom properties are the theming API. Adapter lifecycle is bound to the SemanticElement.id it proxies.

Your task — implement two Web Components in packages/web-components/src/:

1. packages/web-components/src/a11y-field-proxy.ts
   Define customElements.define("a11y-field-proxy", class A11yFieldProxy extends HTMLElement):
   - Observed attributes: target-element-id, label, value, type ("text"|"number"|"email"|"search"), required, error-message
   - connectedCallback: creates a closed Shadow DOM root; renders a label + input inside it
   - Shadow DOM HTML structure:
     <style>/* CSS custom property theming: --a11y-bg, --a11y-fg, --a11y-border, --a11y-focus-ring */</style>
     <label part="label" id="proxy-label"></label>
     <input part="input" aria-labelledby="proxy-label" />
     <span part="error" role="alert" aria-live="assertive"></span>
   - On input event: dispatch a custom event "a11y-value-change" with { detail: { value, targetElementId } } on the host element
   - On external value change (attribute change): update the shadow input's value
   - On error-message attribute: populate the error span and set aria-invalid on input
   - Implement disconnectedCallback that removes the element cleanly

2. packages/web-components/src/a11y-live-region.ts
   Define customElements.define("a11y-live-region", class A11yLiveRegion extends HTMLElement):
   - Observed attributes: politeness ("polite"|"assertive"), atomic
   - connectedCallback: creates closed Shadow DOM with a single <div role="status" aria-live="polite" aria-atomic="true"></div>
   - Reflects politeness attribute to aria-live
   - Exposes announce(message: string, clearAfterMs?: number): void method:
     Sets the div's textContent to message; if clearAfterMs provided, clears after that duration
   - Used for route-change announcements and skill result feedback

3. packages/web-components/src/types.ts
   Export AccessibilityAdapter interface:
   - targetElementId: string
   - semanticIntent: string
   - interactionContract: unknown (typed loosely to avoid circular deps)
   - adaptationConfig: { skillId: string; mountPoint: "adjacent" | "overlay"; zIndexStrategy: "isolated-stacking-context" }

4. packages/web-components/src/mount.ts
   Export mountAdapter(targetEl: Element, config: AccessibilityAdapter): HTMLElement
   - Creates the appropriate custom element based on config.adaptationConfig.skillId
   - Inserts it adjacent to targetEl (insertAdjacentElement "afterend") or as an overlay (position:absolute, isolated stacking context via isolation: isolate)
   - Returns the mounted element

5. packages/web-components/src/__tests__/a11y-live-region.test.ts (jsdom environment):
   Test: announce() sets textContent; clearAfterMs clears it; aria-live reflects politeness attribute.

6. packages/web-components/package.json: name "@aua/web-components", version "0.1.0"

Do not replace the target element. Do not use light DOM for injected controls. Stay within packages/web-components/.
```

---

## AGENT-010 — Form Agent: Framework Detection and Safe-Write Strategy

```
You are implementing the Form Agent for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-010 decision: the Form Agent (deterministic service, NOT an LLM agent) detects the underlying framework and uses the correct write strategy. For React-controlled inputs: use the native input value setter via Object.getOwnPropertyDescriptor before dispatching a synthetic input event. Every write is followed by mandatory verification. No single technique works for 100% of frameworks — verification (not blind write success) is the source of truth.

Your task — implement packages/form-agent/src/:

1. packages/form-agent/src/framework-detector.ts
   Export detectFramework(el: HTMLElement): "react" | "vue" | "angular" | "native" | "custom-shadow" | "unknown"
   Detection heuristics:
   - "react": check el._reactFiber || el.__reactFiber || el._reactInternals (any key starting with "__reactFiber" or "_reactFiber")
   - "vue": check el.__vue__ || el.__vue3__
   - "angular": check el.__ngContext || el.hasAttribute("ng-reflect-model")
   - "custom-shadow": check el.shadowRoot !== null
   - "native": el tagName is INPUT/TEXTAREA/SELECT and none of the above
   - "unknown": fallback

2. packages/form-agent/src/write-strategies.ts
   Export interface WriteStrategy { write(el: HTMLInputElement, value: string): boolean }

   Export NativeWriteStrategy implements WriteStrategy:
   - Sets el.value = value directly
   - Dispatches new Event("input", { bubbles: true }) and new Event("change", { bubbles: true })
   - Returns true

   Export ReactWriteStrategy implements WriteStrategy:
   - Gets the native setter: Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
   - If setter not available, falls back to NativeWriteStrategy
   - Calls setter.call(el, value)
   - Dispatches new Event("input", { bubbles: true, cancelable: true })
   - Returns true

   Export ShadowRootFallbackStrategy implements WriteStrategy:
   - Returns false (cannot safely write; caller should use inject_field_proxy skill)

3. packages/form-agent/src/form-agent.ts
   Export class FormAgent:
   - write(el: HTMLInputElement, value: string): { success: boolean; strategy: string; needsProxy: boolean }
     a. Detect framework
     b. Pick strategy: react → ReactWriteStrategy, native/vue/angular → NativeWriteStrategy, custom-shadow → ShadowRootFallbackStrategy, unknown → NativeWriteStrategy
     c. Call strategy.write(el, value)
     d. If strategy returns false → return { success: false, strategy: "shadow-fallback", needsProxy: true }
     e. Otherwise return { success: true, strategy: name, needsProxy: false }
   - readValue(el: HTMLInputElement): string — reads el.value

4. packages/form-agent/src/__tests__/write-strategies.test.ts (jsdom environment):
   Test:
   - NativeWriteStrategy sets value and fires events
   - ReactWriteStrategy uses native setter when available
   - ShadowRootFallbackStrategy returns false
   - detectFramework returns "native" for plain input, "react" for fiber-annotated input

5. packages/form-agent/package.json: name "@aua/form-agent", version "0.1.0"

Do not make any LLM calls here. Do not interact with the backend. This is a deterministic DOM service. Stay within packages/form-agent/.
```

---

## AGENT-011 — Accessible Routing Layer

```
You are implementing the accessible routing layer for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-011 decision: framework-agnostic observation only — monkey-patch history.pushState/replaceState in the page-context bridge, listen to popstate, correlate with DOM mutations/heading changes. Optional framework adapters layer on top. Route-change announcement via <a11y-live-region>. Silence is safer than incorrect announcement.

Your task — implement packages/routing-layer/src/:

1. packages/routing-layer/src/route-detector.ts
   Export class RouteDetector:
   - Listens for window.postMessage events with { type: "AUA_ROUTE_CHANGE" } (posted by the page-context bridge)
   - Listens for window popstate events
   - Tracks lastUrl: string
   - Exposes onRouteChange: ((newUrl: string, previousUrl: string) => void) | null callback
   - Constructor takes window reference for testability
   - start() / stop() methods

2. packages/routing-layer/src/heading-detector.ts
   Export class HeadingDetector:
   - Accepts a MutationObserver-like interface (for testability)
   - Observes document for heading mutations (h1–h3 appearing or changing text)
   - Exposes onHeadingChange: ((heading: string) => void) | null callback
   - Used as a fallback signal when no explicit route-change event is received
   - Implements a 200ms debounce to avoid rapid-fire announcements on complex re-renders

3. packages/routing-layer/src/focus-restorer.ts
   Export class FocusRestorer:
   - restoreToMainHeading(): void — focuses the first h1 in document, falls back to first h2, then first [role="main"], then document.body
   - restoreToLandmark(landmark: string): void — focuses the first element matching the landmark selector

4. packages/routing-layer/src/routing-accessibility-service.ts
   Export class RoutingAccessibilityService:
   - Constructor accepts: routeDetector: RouteDetector, headingDetector: HeadingDetector, focusRestorer: FocusRestorer, liveRegion: { announce(msg: string): void }
   - start(): wires up onRouteChange and onHeadingChange callbacks
   - On route change: announces "Navigated to <title or heading>" via liveRegion, then calls focusRestorer.restoreToMainHeading()
   - On heading change (if no route change detected within 200ms): announces heading change
   - stop(): tears down listeners

5. packages/routing-layer/src/__tests__/routing-service.test.ts:
   Test: route change fires announcement + focus restore; heading change fires if no route signal; no false announcement when no change detected.

6. packages/routing-layer/package.json: name "@aua/routing-layer", version "0.1.0"

Do not implement the page-bridge monkey-patching here (that's in AGENT-002). Stay within packages/routing-layer/.
```

---

## AGENT-012 — Mobile Companion: Pairing Protocol and WebSocket Session Channel

```
You are implementing the mobile pairing protocol for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-012 decision: QR or short-lived numeric code generated by the browser extension, ephemeral token (single-use, ~2 min TTL) exchanged through the Mobile Pairing Service (backend-mediated, never P2P). Session channel: WebSocket to Session Gateway. Threat model: single-use tokens, session-bound credentials, mobile app receives only UserIntent-shaped commands — never raw page content.

Your task — implement packages/mobile-pairing/:

1. packages/mobile-pairing/src/types.ts
   Export:
   - PairingToken: { token: string; expiresAt: number; sessionId: string; used: boolean }
   - PairingCode: { numericCode: string; qrData: string; token: PairingToken }
   - MobileCommand: { type: "user-intent"; intent: UserIntent; sessionId: string; commandId: string } (UserIntent imported from @aua/ai-provider)
   - PairingChannelMessage: { type: "paired"; sessionId: string } | { type: "command"; command: MobileCommand } | { type: "heartbeat" } | { type: "error"; code: string }

2. packages/mobile-pairing/src/token-generator.ts
   Export generatePairingToken(sessionId: string, ttlMs?: number): PairingToken
   - Uses crypto.randomUUID() for the token value
   - ttlMs defaults to 120_000 (2 minutes)
   - expiresAt = Date.now() + ttlMs
   - used: false

   Export generatePairingCode(token: PairingToken): PairingCode
   - numericCode: 6-digit string derived from token (first 6 hex chars of a sha-256-like hash, converted to decimal mod 1_000_000, zero-padded)
   - qrData: JSON.stringify({ token: token.token, sessionId: token.sessionId, expiresAt: token.expiresAt })

   Export isTokenValid(token: PairingToken): boolean
   - Returns false if token.used or token.expiresAt <= Date.now()

3. packages/mobile-pairing/src/pairing-channel.ts
   Export class PairingChannel:
   - Constructor accepts wsUrl: string, sessionId: string, onMessage: (msg: PairingChannelMessage) => void
   - connect(): void — opens a WebSocket; on message: parses JSON and calls onMessage; on error: calls onMessage({ type: "error", code: "ws-error" })
   - disconnect(): void — closes WebSocket
   - send(msg: MobileCommand): void — JSON.stringify and ws.send
   - State: "disconnected" | "connecting" | "connected"
   - In non-browser environments (no WebSocket global), connect() immediately emits error

4. packages/mobile-pairing/src/__tests__/token-generator.test.ts
   Test: token has correct TTL; isTokenValid false when expired; isTokenValid false when used; numeric code is 6 digits.

5. packages/mobile-pairing/src/__tests__/pairing-channel.test.ts (mock WebSocket):
   Test: connect → connected state; incoming message → onMessage called; disconnect → closed.

6. packages/mobile-pairing/package.json: name "@aua/mobile-pairing", version "0.1.0"

Do not implement the HTTP pairing service backend here (AGENT-020). Mobile app receives UserIntent only — never raw DOM. Stay within packages/mobile-pairing/.
```

---

## AGENT-013 — State Management: Per-Tab Session Store and Event Bus

```
You are implementing the state management layer for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-013 decision: in-memory SemanticPageModel + InteractionContract cached in extension local storage. No global mutable singleton — state is scoped per-tab session (session_id + page_id). Cross-boundary sync is one-directional and event-based — browser emits AuditEvents and session summaries to the backend; backend never pushes silent state mutations into the browser's SemanticPageModel. Backend outage must not corrupt browser-local state.

Your task — implement packages/state/:

1. packages/state/src/types.ts
   Export:
   - SessionKey: { sessionId: string; pageId: string; tabId: number }
   - TabSession: { key: SessionKey; semanticModel: SemanticPageModel | null; contract: InteractionContract; createdAt: number; updatedAt: number }
   - AuditEvent: { type: string; sessionId: string; pageId: string; elementId?: string; skillId?: string; timestamp: number; redacted: boolean; outcome?: string }
   (Import SemanticPageModel from @aua/semantic-model, InteractionContract from @aua/interaction-contract)

2. packages/state/src/session-store.ts
   Export class SessionStore:
   - private sessions: Map<string, TabSession> (key is `${sessionId}:${pageId}:${tabId}`)
   - createSession(key: SessionKey, contract: InteractionContract): TabSession
   - getSession(key: SessionKey): TabSession | undefined
   - updateSemanticModel(key: SessionKey, model: SemanticPageModel): void — only if session exists; updates updatedAt
   - removeSession(key: SessionKey): void
   - No cross-session state: each tab session is fully isolated

3. packages/state/src/event-bus.ts
   Export class EventBus:
   - subscribe<T>(eventType: string, handler: (event: T) => void): () => void (returns unsubscribe fn)
   - emit<T>(eventType: string, event: T): void
   - No event persistence — in-memory only

4. packages/state/src/audit-log.ts
   Export class AuditLog:
   - private buffer: AuditEvent[]
   - record(event: AuditEvent): void
     - MUST check: if event.elementId refers to a sensitive element, enforce event.redacted === true; if not, throw Error("audit-log: redacted must be true for sensitive elements")
   - flush(): AuditEvent[] — returns and clears buffer (for batch sending to backend)
   - Note: this is a local buffer; flushing to the backend is the responsibility of the backend transport layer

5. packages/state/src/__tests__/session-store.test.ts
   Test: create/get/update/remove session; isolation between sessions; updateSemanticModel on missing session is a no-op.

6. packages/state/src/__tests__/audit-log.test.ts
   Test: sensitive event with redacted: false → throws; sensitive event with redacted: true → recorded; non-sensitive event → recorded.

7. packages/state/package.json: name "@aua/state", version "0.1.0"

Stay within packages/state/. Do not add HTTP calls here.
```

---

## AGENT-014 — Security Boundary: Redaction Enforcement, CSP, and Prompt Injection Guards

```
You are implementing the security boundary enforcement utilities for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-014 decision: LLMs never receive unrestricted privileged browser APIs — this is a hard invariant. Reasoning providers receive only redacted SemanticPageModel slices and return schema-constrained structured output. Sensitive element values are stripped at serialization, not by consumer discipline. No eval, no dynamic code. Prompt injection is mitigated by stripping free-form text from model inputs. Every skill invocation validates against the schema before execution.

Your task — implement packages/security/:

1. packages/security/src/invariants.ts
   Export assertNeverSendRawDom(slice: unknown): void
   - Traverses the object; if any string value exceeds 5000 characters (heuristic for raw DOM content), throws Error("security: raw DOM content detected in provider input")
   Export assertRedactedSlice(slice: unknown): void
   - Checks that the object has no field named "value" at the element level where sensitive is true; throws if found.

2. packages/security/src/prompt-injection-guard.ts
   Export sanitizeForProvider(input: string): string
   - Strips common prompt injection patterns: substrings starting with "Ignore previous instructions", "System:", "You are now", "SYSTEM PROMPT", angle-bracket tags (<...>)
   - Truncates to 2000 characters maximum
   - Returns the cleaned string
   Export containsInjectionPattern(input: string): boolean
   - Returns true if any injection pattern is detected (used for logging/alerting)

3. packages/security/src/permission-guard.ts
   Export class PermissionGuard:
   - Constructor accepts allowedClasses: CapabilityClass[] (from @aua/skill-sdk)
   - checkCapability(cls: CapabilityClass, confirmBeforeAction: boolean): "allow" | "require-confirm" | "block"
     Rules:
     - AUTHENTICATE, PAYMENT, DESTRUCTIVE → always "require-confirm" regardless of confirmBeforeAction
     - SUBMIT → "require-confirm" if confirmBeforeAction is true, else "allow"
     - Others → "allow" if in allowedClasses, else "block"
   - This re-validates at the guard level, independent of what the Planner/Executor claimed

4. packages/security/src/csp-checker.ts
   Export checkExtensionCsp(policy: string): { valid: boolean; violations: string[] }
   - Checks that the CSP string does not contain "unsafe-eval", "unsafe-inline" in script-src
   - Checks that script-src does not contain wildcard "*"
   - Checks that connect-src does not allow "*"
   - Returns violations array

5. packages/security/src/__tests__/prompt-injection-guard.test.ts
   Test: known injection patterns are caught; clean input passes; truncation at 2000 chars.

6. packages/security/src/__tests__/permission-guard.test.ts
   Test: DESTRUCTIVE always requires confirm; SUBMIT respects preference; blocked class is blocked.

7. packages/security/package.json: name "@aua/security", version "0.1.0"

Do not add HTTP calls or browser API access here. Stay within packages/security/.
```

---

## AGENT-015 — Privacy / Data Handling: Redaction Pipeline and Data-Minimization Validators

```
You are implementing the privacy and data-minimization enforcement layer for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-015 decision: local-first processing — SemanticPageModel construction, barrier detection, and skill execution happen entirely in-browser; only ambiguous cases invoke a remote reasoning call with a redacted slice. Sensitive field values never leave the browser as values — only as presence/state booleans. Redaction is structural, not by convention. Raw audio, raw DOM, sensitive values, unredacted transcripts beyond the active session: never persisted.

Your task — implement packages/privacy/:

1. packages/privacy/src/data-classes.ts
   Export enum DataClass:
   - SENSITIVE_VALUE = "sensitive_value"     // passwords, payment fields
   - FORM_INPUT = "form_input"               // non-sensitive user input
   - PAGE_STRUCTURE = "page_structure"       // redacted SemanticPageModel
   - AUDIO_TRANSCRIPT = "audio_transcript"   // session-scoped, not persisted beyond session
   - AUDIT_METADATA = "audit_metadata"       // timestamps, skill IDs, outcomes
   - TELEMETRY = "telemetry"                 // latency, counts — no content

   Export DATA_CLASS_RETENTION: Record<DataClass, "never" | "session" | "configurable">
   - SENSITIVE_VALUE: "never"
   - FORM_INPUT: "session"
   - PAGE_STRUCTURE: "session"
   - AUDIO_TRANSCRIPT: "session"
   - AUDIT_METADATA: "configurable"
   - TELEMETRY: "configurable"

2. packages/privacy/src/telemetry-redaction-validator.ts
   Export interface TelemetryPayload { sessionId: string; eventType: string; elementId?: string; sensitive?: boolean; [key: string]: unknown }
   Export validateTelemetryPayload(payload: TelemetryPayload): { valid: boolean; violations: string[] }
   Rules:
   - If sensitive === true: check no field named "value", "rawText", "utterance", "transcript" is present → violation if found
   - Check no field value is a string longer than 200 chars (heuristic for content leakage) → violation if found
   - Returns violations list

3. packages/privacy/src/audio-session-cleaner.ts
   Export class AudioSessionCleaner:
   - private sessionBuffers: Map<string, { rawUtterance?: string; startedAt: number }>
   - startSession(sessionId: string): void
   - recordUtterance(sessionId: string, rawUtterance: string): void
   - endSession(sessionId: string): { finalUtterance: string | null }
     Returns the last utterance, then deletes the session buffer (raw audio not persisted)
   - clearAll(): void — clears all session buffers

4. packages/privacy/src/__tests__/telemetry-redaction-validator.test.ts
   Test: payload with sensitive=true and value field → violation; clean payload → valid; long string field → violation.

5. packages/privacy/src/__tests__/audio-session-cleaner.test.ts
   Test: endSession returns utterance then clears; clearAll removes all sessions; accessing ended session returns null.

6. packages/privacy/package.json: name "@aua/privacy", version "0.1.0"

Do not add any network calls. Do not persist sensitive data to disk/storage. Stay within packages/privacy/.
```

---

## AGENT-016 — Observability: OpenTelemetry Spans, Domain Correlation IDs, and Redaction at Ingestion

```
You are implementing the observability layer for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-016 decision: OpenTelemetry semantic conventions + custom domain span schema. Domain correlation IDs: session_id, page_id, interaction_id, agent_run_id, skill_execution_id, adaptation_id, voice_turn_id. Observability pipeline failure must NEVER block user-facing action — emission is fire-and-forget with local buffering and drop-oldest backpressure. Redaction enforced at ingestion time, not downstream.

Your task — implement packages/observability/:

1. packages/observability/src/span-schema.ts
   Export:
   - DomainAttributes: { "aua.session_id": string; "aua.page_id": string; "aua.interaction_id"?: string; "aua.agent_run_id"?: string; "aua.skill_execution_id"?: string; "aua.adaptation_id"?: string; "aua.voice_turn_id"?: string }
   - SpanName: "aua.barrier.detect" | "aua.skill.execute" | "aua.adaptation.plan" | "aua.voice.turn" | "aua.model.call" | "aua.dom.analyze" | "aua.verification"
   - SpanStatus: "ok" | "error" | "degraded"
   - AuaSpan: { name: SpanName; attributes: DomainAttributes & Record<string, string | number | boolean>; startMs: number; endMs?: number; status: SpanStatus; error?: string }

2. packages/observability/src/span-buffer.ts
   Export class SpanBuffer:
   - private buffer: AuaSpan[] = []
   - private maxSize: number (default 500)
   - record(span: AuaSpan): void — if buffer.length >= maxSize, drops the oldest (shift) before pushing
   - flush(): AuaSpan[] — returns and clears buffer
   - size(): number

3. packages/observability/src/ingestion-validator.ts
   Export validateSpanBeforeIngestion(span: AuaSpan, sensitiveElementIds: Set<string>): { valid: boolean; reason?: string }
   Rules (mirrors ADR-016 redaction enforcement):
   - If span.attributes["aua.element_id"] is in sensitiveElementIds and span.attributes["aua.redacted"] !== true → invalid, reason: "sensitive-element-not-redacted"
   - If span contains any attribute key ending in "_value" or "_content" → invalid, reason: "potential-content-leak"
   - Otherwise valid.

4. packages/observability/src/tracer.ts
   Export class AuaTracer:
   - constructor(buffer: SpanBuffer, sensitiveElementIds: () => Set<string>)
   - startSpan(name: SpanName, attributes: DomainAttributes): AuaSpan — records startMs
   - endSpan(span: AuaSpan, status: SpanStatus, error?: string): void
     - Sets endMs, status, error
     - Calls validateSpanBeforeIngestion; if invalid, does NOT buffer the span and increments a droppedSpans counter
     - Otherwise records in buffer
     - NEVER throws; wraps everything in try/catch
   - getDroppedCount(): number

5. packages/observability/src/__tests__/tracer.test.ts
   Test: sensitive element span without redacted flag → dropped; clean span → buffered; buffer overflow drops oldest; tracer never throws even on malformed input.

6. packages/observability/package.json: name "@aua/observability", version "0.1.0"

Do not add real OTel SDK dependency (keep it a stub that matches the schema). Do not block any code path. Stay within packages/observability/.
```

---

## AGENT-017 — Verification Engine: VerificationResult, Strategies, Retry, and Rollback

```
You are implementing the Verification Engine for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-017 decision: every SkillInvocation with a verificationStrategy produces a mandatory VerificationResult before reporting success. Methods: dom-read, route-check, state-diff, accessibility-check. Timeout: default 2s. At most one retry. Rollback for DESTRUCTIVE-class skills on failure. Failure classification: timeout | mismatch | element-gone | framework-blocked — each drives a distinct user-facing message.

Your task — implement packages/verification-engine/src/:

1. packages/verification-engine/src/types.ts
   Export:
   - VerificationMethod: "dom-read" | "route-check" | "state-diff" | "accessibility-check"
   - VerificationConfig: { method: VerificationMethod; expectedValue?: string; timeoutMs?: number }
   - VerificationStatus: "success" | "failure"
   - FailureClass: "timeout" | "mismatch" | "element-gone" | "framework-blocked"
   - VerificationResult: { status: VerificationStatus; method: VerificationMethod; failureClass?: FailureClass; actualValue?: string; expectedValue?: string; durationMs: number }

2. packages/verification-engine/src/strategies/dom-read-strategy.ts
   Export async function verifyDomRead(elementId: string, expected: string, timeoutMs: number, readFn: (id: string) => string | null): Promise<VerificationResult>
   - Calls readFn(elementId)
   - If null → { status: "failure", failureClass: "element-gone", ... }
   - If actual !== expected → { status: "failure", failureClass: "mismatch", actualValue: actual, ... }
   - If match → { status: "success", ... }
   - Wraps the readFn call in a Promise.race with a timeout of timeoutMs → on timeout: { status: "failure", failureClass: "timeout" }

3. packages/verification-engine/src/strategies/accessibility-check-strategy.ts
   Export async function verifyAccessibility(elementId: string, readFn: (id: string) => Element | null): Promise<VerificationResult>
   - Gets the element
   - Checks element.hasAttribute("aria-label") || element.hasAttribute("aria-labelledby") || element.textContent?.trim()
   - If accessible → success; else → mismatch with actualValue: "no accessible name"

4. packages/verification-engine/src/verification-engine.ts
   Export class VerificationEngine:
   - verify(config: VerificationConfig, elementId: string, readFn: (id: string) => string | null): Promise<VerificationResult>
     - Dispatches to the correct strategy based on config.method
     - Uses config.timeoutMs ?? 2000
   - verifyWithRetry(config: VerificationConfig, elementId: string, readFn: ...): Promise<VerificationResult>
     - Calls verify once; if failure and it's not "element-gone", waits 200ms and retries ONCE
     - Returns final result regardless
   - rollback(skillId: string, elementId: string, rollbackFn: (id: string) => Promise<void>): Promise<{ rolled_back: boolean; error?: string }>
     - Calls rollbackFn; catches errors; returns { rolled_back: false, error: msg } on failure

5. packages/verification-engine/src/__tests__/verification-engine.test.ts
   Test: dom-read success path; element-gone returns correct failureClass; timeout fires within timeoutMs; single retry on mismatch; no retry on element-gone; rollback fn called on failure.

6. packages/verification-engine/package.json: name "@aua/verification-engine", version "0.1.0"

Do not implement the actual DOM interaction — readFn and rollbackFn are injected by the caller. Stay within packages/verification-engine/.
```

---

## AGENT-018 — Testing Infrastructure: Golden Fixture Sites and Test Utilities

```
You are implementing the testing infrastructure for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-018 decision: E2E tests run against owned golden fixture sites — one HTML fixture per accessibility pattern, versioned in packages/testing. Never test against live third-party sites (non-deterministic). Testing pyramid: unit → contract (JSON Schema validation of messages) → component → agent/tool → deterministic skill → integration → browser extension → cross-browser → E2E (Playwright). Axe-core automated accessibility checks are part of the pyramid.

Your task — implement packages/testing/:

1. packages/testing/src/fixtures/ — create 9 self-contained HTML fixture files:
   Each file is a standalone HTML page with no external dependencies.
   
   - drag-only-slider.html: A slider implemented using only mouse drag events (no keyboard support) — the inaccessible baseline for testing barrier detection.
   - hover-only-menu.html: A navigation menu that shows only on CSS :hover — keyboard users cannot access it.
   - custom-select.html: A div/ul-based fake select dropdown without proper ARIA role="listbox"/option or keyboard handling.
   - modal-focus-trap.html: A modal dialog that does NOT trap focus — focus escapes the dialog.
   - inaccessible-spa-nav.html: A single-page-application-style navigation (using history.pushState on button clicks) that never announces route changes or restores focus.
   - react-controlled-input.html: A React-style controlled input (simulated with vanilla JS overriding the value setter to not respond to direct .value assignments).
   - dynamic-validation.html: A form with validation errors injected dynamically into the DOM without live region announcements.
   - shadow-dom-component.html: A custom element using Shadow DOM for a text input, where the real input is inside the shadow root.
   - accessible-baseline.html: A fully WCAG 2.1 AA compliant reference page — used as a negative test (should detect NO barriers).
   
   Each fixture must include a comment at the top: <!-- AUA TEST FIXTURE: <name> — DO NOT modify without updating matching test expectations -->

2. packages/testing/src/contract-validator.ts
   Export validateMessageAgainstSchema(message: unknown, schemaName: string): { valid: boolean; errors: string[] }
   - Uses Ajv to validate message against a JSON Schema
   - Loads schemas from packages/testing/src/schemas/
   Export validateSemanticPageModel(model: unknown): { valid: boolean; errors: string[] }

3. packages/testing/src/schemas/ — create minimal JSON Schema files:
   - semantic-page-model.schema.json: validates SemanticPageModel shape (required: sessionId, pageId, url, elements array, redacted: true)
   - interaction-contract.schema.json: validates InteractionContract shape (required: version "1.0.0", capabilities object, preferences object)
   - audit-event.schema.json: validates AuditEvent (required: type, sessionId, timestamp, redacted boolean)

4. packages/testing/src/stub-factories.ts
   Export factory functions for test stubs:
   - makeStubBarrier(overrides?): Barrier
   - makeStubSemanticPageModel(overrides?): SemanticPageModel
   - makeStubInteractionContract(overrides?): InteractionContract
   - makeStubAuditEvent(overrides?): AuditEvent
   All factories produce valid, minimal objects with sensible defaults.

5. packages/testing/src/__tests__/contract-validator.test.ts
   Test: valid SemanticPageModel passes schema; model with redacted: false fails; model missing required fields fails.

6. packages/testing/package.json: name "@aua/testing", version "0.1.0", add ajv dependency.

Stay within packages/testing/. Do not write Playwright tests here — those require a separate E2E setup task.
```

---

## AGENT-019 — Persistence / Storage: Session Store, Audit Record Schema, and Skill Registry Loader

```
You are implementing the persistence layer for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-019 decision: pattern-first, vendor-agnostic. Session/audit store: document or relational store for session metadata + AuditEvent records (redacted per ADR-015/016). LangGraph checkpoint store: durable checkpointer for multi-step flows. Skill Registry: versioned source-controlled JSON in packages/skill-sdk — not a runtime-mutable database. Browser-local: extension storage only, never synced to server by default. Explicitly excluded from persistence: raw audio, raw DOM, sensitive values, unredacted transcripts.

Your task — implement packages/persistence/:

1. packages/persistence/src/types.ts
   Export:
   - SessionRecord: { sessionId: string; tabId: number; createdAt: string; updatedAt: string; pairingSessionId?: string; contractVersion: string }
   - AuditRecord: { id: string; sessionId: string; pageId: string; eventType: string; skillId?: string; elementId?: string; outcome?: string; timestamp: string; redacted: true }
   - CheckpointRecord: { checkpointId: string; sessionId: string; stepId: string; state: object; createdAt: string }
   AuditRecord.redacted is always literally true (not boolean) — enforced by type.

2. packages/persistence/src/session-repository.ts
   Export interface SessionRepository:
   - createSession(record: Omit<SessionRecord, "createdAt" | "updatedAt">): Promise<SessionRecord>
   - getSession(sessionId: string): Promise<SessionRecord | null>
   - updateSession(sessionId: string, updates: Partial<SessionRecord>): Promise<SessionRecord | null>
   - deleteSession(sessionId: string): Promise<void>
   Export class InMemorySessionRepository implements SessionRepository (for tests and early phases).

3. packages/persistence/src/audit-repository.ts
   Export interface AuditRepository:
   - append(record: AuditRecord): Promise<void>
   - queryBySession(sessionId: string, limit?: number): Promise<AuditRecord[]>
   - purgeOlderThan(cutoffIso: string): Promise<number> (returns count deleted)
   Export class InMemoryAuditRepository implements AuditRepository.
   Add a guard in InMemoryAuditRepository.append: if record.redacted !== true, throw Error("persistence: AuditRecord.redacted must be true").

4. packages/persistence/src/checkpoint-repository.ts
   Export interface CheckpointRepository:
   - save(record: CheckpointRecord): Promise<void>
   - load(checkpointId: string): Promise<CheckpointRecord | null>
   - listBySession(sessionId: string): Promise<CheckpointRecord[]>
   Export class InMemoryCheckpointRepository implements CheckpointRepository.

5. packages/persistence/src/skill-registry-loader.ts
   Export loadSkillDefinitionsFromJson(jsonDir: string): SkillDefinition[]
   - Reads all *.json files from jsonDir synchronously using Node.js fs module
   - Parses each as SkillDefinition
   - Returns the array; throws if any file is not valid JSON
   - Import SkillDefinition from @aua/skill-sdk
   This is only called at startup (deploy-time load), not at runtime from an agent.

6. packages/persistence/src/__tests__/audit-repository.test.ts
   Test: append with redacted: false → throws; append with redacted: true → stored; queryBySession returns correct records; purgeOlderThan removes correct records.

7. packages/persistence/package.json: name "@aua/persistence", version "0.1.0"

Use only in-memory implementations — no real database client. Stay within packages/persistence/.
```

---

## AGENT-020 — Deployment Topology: Session Gateway Stub, Service Manifests, and Monorepo Config

```
You are implementing the deployment topology scaffolding for a browser-extension-based accessibility platform called AUA, located at c:\Users\shwarnlata.kumari\hackton\hackton.

ADR-020 decision: containerized backend services (Session Gateway, Agent Orchestration Service, Skill Registry Service, Mobile Pairing Service) behind a load balancer. Session Gateway is the single ingress. Voice service is stateless and scaled independently. Skill-schema versioning is additive-only so older extensions safely talk to newer backends. OTel collector as sidecar. Each service fails independently; Session Gateway has circuit breakers per downstream.

Your task — scaffold the backend services and monorepo configuration:

1. packages/session-gateway/src/index.ts
   A minimal Express (or plain http.createServer) HTTP + WebSocket server stub:
   - GET /health → { status: "ok", version: "0.1.0", timestamp: Date.now() }
   - POST /session → creates a new session (calls InMemorySessionRepository.createSession), returns { sessionId }
   - WebSocket upgrade at /ws/:sessionId → accepts connection, echoes back { type: "connected", sessionId } on open
   - GET /degraded → { degraded: false } (circuit-breaker status placeholder)
   Export startGateway(port: number): http.Server

2. packages/session-gateway/src/__tests__/gateway.test.ts (using supertest or plain http):
   Test: GET /health returns 200; POST /session returns sessionId; GET /degraded returns degraded: false.

3. packages/session-gateway/package.json: name "@aua/session-gateway", version "0.1.0", deps: express (or none for raw http), ws.

4. Root-level package.json (if not present, create; if present, update):
   - private: true
   - workspaces: ["packages/*"]
   - scripts: { "build": "tsc -b packages/*/tsconfig.json", "test": "jest --projects packages/*/jest.config.*", "lint": "eslint packages/*/src" }

5. Root-level tsconfig.base.json:
   { "compilerOptions": { "strict": true, "module": "ESNext", "moduleResolution": "bundler", "target": "ES2022", "lib": ["ES2022", "DOM"], "declaration": true, "sourceMap": true, "esModuleInterop": true } }

6. Root-level jest.config.base.js:
   module.exports = { preset: "ts-jest", testEnvironment: "node", coverageThreshold: { global: { branches: 80, functions: 80 } } }
   Note: packages/semantic-model requires 100% branch coverage on redact.ts — its jest.config.js should override to 100% for that file specifically.

7. .github/workflows/ci.yml (create if not present):
   name: CI
   on: [push, pull_request]
   jobs:
     build-and-test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4 with node-version: "20"
         - run: npm ci
         - run: npm run build
         - run: npm test -- --coverage
         - run: npm run lint

8. Root-level .eslintrc.json: { "root": true, "parser": "@typescript-eslint/parser", "plugins": ["@typescript-eslint"], "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"], "rules": { "no-eval": "error", "@typescript-eslint/no-explicit-any": "warn" } }

Do not implement real database connections or real cloud infrastructure. This is the monorepo scaffold and the session-gateway stub only. Stay within packages/session-gateway/ and the root config files.
```

---

## Notes on Parallelism

These 20 prompts target **disjoint packages**:

| Agent | Package |
|---|---|
| AGENT-001 | `packages/shared` |
| AGENT-002 | `packages/extension` |
| AGENT-003 | `packages/semantic-model` |
| AGENT-004 | `packages/interaction-contract` |
| AGENT-005 | `packages/agent-runtime` |
| AGENT-006 | `packages/ai-provider` |
| AGENT-007 | `packages/voice` |
| AGENT-008 | `packages/skill-sdk` |
| AGENT-009 | `packages/web-components` |
| AGENT-010 | `packages/form-agent` |
| AGENT-011 | `packages/routing-layer` |
| AGENT-012 | `packages/mobile-pairing` |
| AGENT-013 | `packages/state` |
| AGENT-014 | `packages/security` |
| AGENT-015 | `packages/privacy` |
| AGENT-016 | `packages/observability` |
| AGENT-017 | `packages/verification-engine` |
| AGENT-018 | `packages/testing` |
| AGENT-019 | `packages/persistence` |
| AGENT-020 | `packages/session-gateway` + root config |

All 20 can run in parallel. Each prompt is self-contained — the agent needs no other context beyond what is in the prompt itself.
