export interface UserIntent {
  intentId: string;
  intent:
    | "fill-field"
    | "navigate-to"
    | "read-region"
    | "read-errors"
    | "set-value"
    | "describe-page"
    | "activate-action"
    | "custom";
  semanticTarget?: string;    // resolved business concept, not a selector
  value?: string | number;
  confidence: number;
  rawUtterance?: string;      // never persisted beyond the active session; see ADR-015
  disambiguationCandidates?: { elementId: string; score: number }[];
}

export interface Barrier {
  barrierId: string;
  elementId: string;
  requiredCapabilities: string[];
  availableCapabilities: string[];
  blockedIntent?: string;
  severity: "blocking" | "usability" | "preference-mismatch" | "unknown" | "none";
  confidence: number;
  determinedBy: "rule" | "inference";
}

export interface AdaptationPlan {
  planId: string;
  barrierId: string;
  chosenSkillId: string;
  rationale: string;          // required — no silent selection
  determinedBy: "rule" | "inference";
  fallbackPlanId?: string;
}

export interface AgentDecision {
  decisionId: string;
  agentRunId: string;
  input: { barrier?: Barrier; intent?: UserIntent };
  output:
    | AdaptationPlan
    | { action: "confirm-with-user" }
    | { action: "decline"; reason: string };
  modelProvider?: string;     // omitted when decision was purely rule-based
  latencyMs: number;
}

export interface SpeechEvent {
  sessionId: string;
  turnId: string;
  type: "partial-transcript" | "final-transcript" | "tts-start" | "tts-end" | "barge-in";
  text?: string;
  languageDetected?: string;
  timestamp: string;
}

export interface NavigationEvent {
  navigationId: string;
  method: "pushState" | "replaceState" | "popstate" | "dom-mutation";
  fromRoute: string;
  toRoute: string;
  timestamp: string;
}

export interface AuditEvent {
  eventId: string;
  correlationIds: {
    sessionId: string;
    pageId: string;
    interactionId?: string;
    agentRunId?: string;
    skillExecutionId?: string;
    adaptationId?: string;
    voiceTurnId?: string;
  };
  type: string;
  redacted: boolean; // MUST be true for any event touching a `sensitive` element
  timestamp: string;
}
