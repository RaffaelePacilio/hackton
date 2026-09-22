/**
 * Core `SpeechProvider` contract (ADR-007, WP-015). This package is
 * self-contained — voice types are not (yet) part of the frozen
 * `@aua/contracts` package, so they are declared here rather than imported.
 *
 * Two provider modes are implemented behind this single interface:
 *  - `realtime` (Mode B, default): a single streaming session does
 *    STT + reasoning-adjacent turn handling + TTS (e.g. OpenAI Realtime API).
 *  - `chained` (Mode A, mandatory fallback): dedicated STT vendor -> text ->
 *    dedicated TTS vendor (e.g. Azure Cognitive Services), plus the
 *    browser/OS-native STT last resort and the offline `NullSpeechProvider`.
 *
 * Client obligations regardless of mode (ADR-007): enable device echo
 * cancellation, cancel in-flight TTS immediately on `interrupt()`, and
 * discard any buffered-but-unheard audio on barge-in. These are caller
 * (UI/session-runtime) responsibilities, not something a `SpeechProvider`
 * implementation can enforce on its own.
 */

export type SpeechMode = "realtime" | "chained";

export interface SpeechSessionConfig {
  sessionId: string;
  language: string;
  mode: SpeechMode;
  sampleRate?: number;
}

export type SpeechEvent =
  | { type: "transcript"; text: string; isFinal: boolean; confidence: number }
  | { type: "error"; code: string; message: string }
  | { type: "end" };

export interface SpeechSession {
  id: string;
  mode: SpeechMode;
  config: SpeechSessionConfig;
  startedAt: number;
}

export interface SpeechProvider {
  mode: SpeechMode;
  startSession(config: SpeechSessionConfig): Promise<SpeechSession>;
  transcribe(session: SpeechSession): AsyncIterable<SpeechEvent>;
  synthesize(session: SpeechSession, text: string): AsyncIterable<Uint8Array>;
  interrupt(sessionId: string): Promise<void>;
  healthCheck(): Promise<boolean>;
}
