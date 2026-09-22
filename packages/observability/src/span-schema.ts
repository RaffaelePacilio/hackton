export interface DomainAttributes {
  "aua.session_id": string;
  "aua.page_id": string;
  "aua.interaction_id"?: string;
  "aua.agent_run_id"?: string;
  "aua.skill_execution_id"?: string;
  "aua.adaptation_id"?: string;
  "aua.voice_turn_id"?: string;
}

export type SpanName =
  | "aua.barrier.detect"
  | "aua.skill.execute"
  | "aua.adaptation.plan"
  | "aua.voice.turn"
  | "aua.model.call"
  | "aua.dom.analyze"
  | "aua.verification";

export type SpanStatus = "ok" | "error" | "degraded";

export interface AuaSpan {
  name: SpanName;
  attributes: DomainAttributes & Record<string, string | number | boolean>;
  startMs: number;
  endMs?: number;
  status: SpanStatus;
  error?: string;
}
