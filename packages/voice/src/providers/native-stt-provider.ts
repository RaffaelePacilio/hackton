import type { SpeechEvent, SpeechProvider, SpeechSession, SpeechSessionConfig } from "../types.js";

/**
 * Minimal surface of the (non-standardized, not present in TypeScript's
 * `lib.dom.d.ts`) Web Speech API `SpeechRecognition` interface this module
 * depends on. Declared locally — rather than assumed as an ambient global —
 * so the injected constructor stays testable without a real browser.
 */
export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string; confidence: number };
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

/** Minimal constructor surface for the (lib.dom-declared) `SpeechSynthesisUtterance`. */
export type SpeechSynthesisUtteranceConstructor = new (text?: string) => SpeechSynthesisUtterance;

/**
 * Last-resort browser/OS-native STT+TTS fallback (ADR-007 "Failure modes /
 * degraded mode"): used only once both the realtime provider and the
 * chained-pipeline provider are unavailable. Works fully offline for basic
 * commands, at reduced accuracy, via the browser's Web Speech API.
 *
 * All browser globals (`SpeechRecognition`/`webkitSpeechRecognition`,
 * `speechSynthesis`, `SpeechSynthesisUtterance`) are read lazily, inside
 * methods, never at module load time or in the constructor — importing or
 * instantiating this class must never throw in Node/test environments that
 * have none of them.
 */
export class NativeSttProvider implements SpeechProvider {
  mode: "chained" = "chained";

  private readonly activeRecognitions = new Map<string, SpeechRecognitionLike>();
  private readonly activeUtterances = new Map<string, SpeechSynthesisUtterance>();

  constructor(
    private readonly speechRecognitionCtor?: SpeechRecognitionConstructor,
    private readonly speechSynthesisImpl?: SpeechSynthesis,
    private readonly utteranceCtor?: SpeechSynthesisUtteranceConstructor,
  ) {}

  private resolveRecognitionCtor(): SpeechRecognitionConstructor | undefined {
    if (this.speechRecognitionCtor) {
      return this.speechRecognitionCtor;
    }
    const g = globalThis as Record<string, unknown>;
    return (g.SpeechRecognition ?? g.webkitSpeechRecognition) as SpeechRecognitionConstructor | undefined;
  }

  private resolveSpeechSynthesis(): SpeechSynthesis | undefined {
    if (this.speechSynthesisImpl) {
      return this.speechSynthesisImpl;
    }
    return (globalThis as Record<string, unknown>).speechSynthesis as SpeechSynthesis | undefined;
  }

  private resolveUtteranceCtor(): SpeechSynthesisUtteranceConstructor | undefined {
    if (this.utteranceCtor) {
      return this.utteranceCtor;
    }
    return (globalThis as Record<string, unknown>).SpeechSynthesisUtterance as
      | SpeechSynthesisUtteranceConstructor
      | undefined;
  }

  async startSession(config: SpeechSessionConfig): Promise<SpeechSession> {
    if (!this.resolveRecognitionCtor()) {
      throw new Error("native-stt-unavailable");
    }
    return { id: config.sessionId, mode: this.mode, config, startedAt: Date.now() };
  }

  /**
   * Bridges `SpeechRecognition`'s callback-based events (`onresult`,
   * `onerror`, `onend`) into an `AsyncIterable<SpeechEvent>` via a small
   * internal queue + a single pending resolver — the standard
   * event-to-async-iterable adapter pattern.
   */
  async *transcribe(session: SpeechSession): AsyncIterable<SpeechEvent> {
    const Ctor = this.resolveRecognitionCtor();
    if (!Ctor) {
      yield { type: "error", code: "native-stt-unavailable", message: "No SpeechRecognition constructor available" };
      yield { type: "end" };
      return;
    }

    const recognition = new Ctor();
    recognition.lang = session.config.language;
    recognition.continuous = true;
    recognition.interimResults = true;
    this.activeRecognitions.set(session.id, recognition);

    const queue: SpeechEvent[] = [];
    let wake: (() => void) | null = null;
    let ended = false;

    const push = (event: SpeechEvent): void => {
      queue.push(event);
      if (wake) {
        const resolve = wake;
        wake = null;
        resolve();
      }
    };

    recognition.onresult = (event) => {
      const result = event.results[event.resultIndex];
      if (!result) {
        return;
      }
      const alternative = result[0];
      push({
        type: "transcript",
        text: alternative.transcript,
        isFinal: result.isFinal,
        confidence: alternative.confidence ?? 0,
      });
    };
    recognition.onerror = (event) => {
      push({ type: "error", code: event.error, message: event.message ?? event.error });
    };
    recognition.onend = () => {
      ended = true;
      push({ type: "end" });
    };

    recognition.start();

    try {
      while (true) {
        if (queue.length === 0) {
          if (ended) {
            return;
          }
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
          continue;
        }
        const event = queue.shift()!;
        yield event;
        if (event.type === "end") {
          return;
        }
      }
    } finally {
      this.activeRecognitions.delete(session.id);
    }
  }

  /**
   * The Web Speech API's `speechSynthesis.speak()` exposes no chunked audio
   * data — it drives the OS/browser TTS engine directly. So this yields a
   * single empty `Uint8Array` once the utterance finishes (or errors),
   * purely to satisfy the `AsyncIterable<Uint8Array>` shape; there is no
   * real audio payload to hand back to the caller in native mode.
   */
  async *synthesize(session: SpeechSession, text: string): AsyncIterable<Uint8Array> {
    const synth = this.resolveSpeechSynthesis();
    const UtteranceCtor = this.resolveUtteranceCtor();
    if (!synth || !UtteranceCtor) {
      yield new Uint8Array(0);
      return;
    }

    const utterance = new UtteranceCtor(text);
    utterance.lang = session.config.language;
    this.activeUtterances.set(session.id, utterance);

    await new Promise<void>((resolve) => {
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      synth.speak(utterance);
    });

    this.activeUtterances.delete(session.id);
    yield new Uint8Array(0);
  }

  async interrupt(sessionId: string): Promise<void> {
    const recognition = this.activeRecognitions.get(sessionId);
    recognition?.stop();

    if (this.activeUtterances.has(sessionId)) {
      this.resolveSpeechSynthesis()?.cancel();
      this.activeUtterances.delete(sessionId);
    }
  }

  async healthCheck(): Promise<boolean> {
    const g = globalThis as Record<string, unknown>;
    return typeof g.SpeechRecognition !== "undefined" || typeof g.webkitSpeechRecognition !== "undefined";
  }
}
