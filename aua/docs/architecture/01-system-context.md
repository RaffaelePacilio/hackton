# 01 — System Context & Container Architecture (C4)

## System Context

```mermaid
graph TD
    User[End user with an Interaction Contract]
    Target[Target Website<br/>unmodified, third-party]
    AUA[Agentic Universal Accessibility Runtime]
    LLM[LLM Provider<br/>abstracted]
    Speech[Speech Provider<br/>abstracted]
    Mobile[Mobile Companion App]
    Obs[Observability Backend]

    User -->|declares capabilities, speaks, types| AUA
    AUA -->|reads DOM, injects components, verifies state| Target
    AUA -->|structured reasoning calls only,<br/>never raw PII/DOM by default| LLM
    AUA -->|audio in/out, transcripts| Speech
    Mobile -->|paired session, push-to-talk| AUA
    AUA -->|traces, metrics, redacted events| Obs
```

Key context boundary: **AUA never sends the target site raw content to an LLM or speech
provider without going through redaction rules defined in ADR-015 (Privacy).**

## Container View

```mermaid
graph TD
    subgraph Browser
        EXT[Browser Extension<br/>MV3: content scripts + service worker]
        BOOT[Universal Accessibility Bootstrap<br/>deterministic, no LLM dependency]
        WC[Accessible Web Component Layer<br/>Shadow DOM adapters]
    end

    subgraph ControlPlane[Backend Control Plane]
        GATE[Session Gateway]
        ORCH[Agent Orchestration Service]
        SKILLS[Skill Registry Service]
        PAIR[Mobile Pairing Service]
        TEL[Observability Pipeline]
        STORE[(Session / Audit Store)]
    end

    subgraph VoicePlane[Voice Service]
        SPEECH[Speech Provider Abstraction]
    end

    subgraph MobilePlane
        MOBILE[Mobile Companion App]
    end

    BOOT --> EXT
    EXT --> WC
    EXT -->|SemanticPageModel, Intent, Barrier| GATE
    GATE --> ORCH
    ORCH --> SKILLS
    ORCH -->|reasoning calls| LLMProvider[LLM Provider Abstraction]
    ORCH --> SPEECH
    GATE --> PAIR
    PAIR --> MOBILE
    MOBILE -->|encrypted session| GATE
    GATE --> TEL
    ORCH --> STORE
```

### Container responsibilities

| Container | Responsibility | Must remain functional even if... |
|---|---|---|
| Universal Accessibility Bootstrap | Create/edit `InteractionContract`, expose recovery UI | LLM, backend, voice are all down |
| Browser Extension (runtime core) | DOM observation, `SemanticPageModel` build, skill execution, verification | Backend is unreachable (degrade to local rules only) |
| Accessible Web Component Layer | Render accessible adapters (proxy pattern) | Target site re-renders/SPA-navigates |
| Session Gateway | AuthN of extension/mobile sessions, request routing | — (single point; see ADR-020 for HA) |
| Agent Orchestration Service | Barrier→Adaptation reasoning, skill selection | LLM provider fails over per ADR-006 |
| Skill Registry Service | Source of truth for skill definitions/versions | — |
| Mobile Pairing Service | QR/token pairing, encrypted channel | Mobile app simply unavailable, browser still works |
| Speech Provider Abstraction | Uniform STT/TTS/realtime interface | Falls back per ADR-007 degraded mode |
| Observability Pipeline | Traces/metrics/redacted events | Failure must never block user-facing action |

## Component View (Browser Extension, expanded)

```mermaid
graph TD
    DOMObs[DOM/Mutation Observer] --> SPM[Semantic Page Model Builder]
    SPM --> Barrier[Barrier Detection Engine]
    IC[Interaction Contract Store] --> Barrier
    Barrier --> Planner[Adaptation Planner]
    Intent[Intent Engine] --> Planner
    Planner --> SkillExec[Skill Executor]
    SkillExec --> WC[Web Component Injector]
    SkillExec --> Verify[Verification Engine]
    Verify -->|pass/fail| Planner
    Voice[Voice Client] --> Intent
    Router[Accessible Routing Layer] --> SPM
```

This component graph is the basis for package boundaries in `08-repository design` and for the
parallelization DAG.
