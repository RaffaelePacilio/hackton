import type { SpeechEvent, SpeechProvider, SpeechSession, SpeechSessionConfig } from "../types.js";

/**
 * Terminal fallback provider (ADR-007 "Failure modes / degraded mode"):
 * used for offline/fully-degraded operation and as the last link in
 * `SpeechFallbackChain` when every real provider is unavailable. It never
 * throws and never touches the network — it exists purely so callers always
 * have a `SpeechProvider` to talk to, even when voice itself cannot work.
 * The platform's non-voice interaction paths remain the real fallback for
 * the end user (ADR-001); this class just keeps the voice call sites safe.
 */
export class NullSpeechProvider implements SpeechProvider {
  mode: "chained" = "chained";

  async startSession(config: SpeechSessionConfig): Promise<SpeechSession> {
    return {
      id: crypto.randomUUID(),
      mode: this.mode,
      config,
      startedAt: Date.now(),
    };
  }

  async *transcribe(_session: SpeechSession): AsyncIterable<SpeechEvent> {
    yield { type: "end" };
  }

  async *synthesize(_session: SpeechSession, _text: string): AsyncIterable<Uint8Array> {
    yield new Uint8Array(0);
  }

  async interrupt(_sessionId: string): Promise<void> {
    // No-op: there is never anything in flight.
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }
}
