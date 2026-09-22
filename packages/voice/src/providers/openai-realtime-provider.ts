import type { SpeechEvent, SpeechProvider, SpeechSession, SpeechSessionConfig } from "../types.js";

/**
 * The minimal surface of the WebSocket API this module depends on. Kept
 * narrow and dependency-injected (rather than referencing the global
 * `WebSocket` directly) so tests can supply a fake implementation without a
 * real socket or the `ws` npm package — same pattern as
 * `packages/mobile-pairing/src/pairing-channel.ts`.
 */
export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(type: string, listener: (ev: any) => void): void;
}

export type WebSocketFactory = (url: string, protocols: string[]) => WebSocketLike;

function defaultWsFactory(url: string, protocols: string[]): WebSocketLike {
  const GlobalWebSocket = (
    globalThis as { WebSocket?: new (url: string, protocols?: string[]) => WebSocketLike }
  ).WebSocket;
  if (!GlobalWebSocket) {
    throw new Error("no-websocket-support");
  }
  return new GlobalWebSocket(url, protocols);
}

/**
 * Decodes a base64 string to raw bytes without a hard dependency on either
 * the browser `atob` global or the Node `Buffer` global — whichever is
 * present is used, so this module works in both runtimes.
 */
function base64ToBytes(base64: string): Uint8Array {
  const globalAtob = (globalThis as { atob?: (data: string) => string }).atob;
  if (typeof globalAtob === "function") {
    const binary = globalAtob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const globalBuffer = (globalThis as { Buffer?: { from(data: string, encoding: string): Uint8Array } }).Buffer;
  if (globalBuffer) {
    return new Uint8Array(globalBuffer.from(base64, "base64"));
  }
  throw new Error("no-base64-decoder-available");
}

export interface OpenAiRealtimeConfig {
  apiKey: string;
  /** Defaults to "gpt-4o-realtime-preview" (ADR-007 Mode B default vendor, Medium confidence). */
  model?: string;
  /** Defaults lazily to the real global `WebSocket`, read inside `startSession`, never at import time. */
  wsFactory?: WebSocketFactory;
  /** Defaults lazily to the real global `fetch`, read inside `healthCheck`, never at import time. */
  fetchImpl?: typeof fetch;
}

/**
 * Concrete Mode B (realtime) `SpeechProvider` implementation (ADR-007,
 * WP-015): a single WebSocket session to OpenAI's Realtime API performs
 * STT + reasoning-adjacent turn handling + TTS, with native barge-in via
 * `response.cancel`.
 *
 * Browser/Node `WebSocket` constructors do not support custom request
 * headers, so the documented workaround (also used by OpenAI's own client
 * libraries) is applied here: the API key and beta flag are carried as
 * WebSocket subprotocols instead of an `Authorization`/`OpenAI-Beta` header.
 */
export class OpenAiRealtimeProvider implements SpeechProvider {
  mode: "realtime" = "realtime";

  private readonly sockets = new Map<string, WebSocketLike>();

  constructor(private readonly config: OpenAiRealtimeConfig) {}

  async startSession(config: SpeechSessionConfig): Promise<SpeechSession> {
    const model = this.config.model ?? "gpt-4o-realtime-preview";
    const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;
    // Documented browser-WebSocket-header workaround: the API key and the
    // realtime beta flag travel as subprotocols, not as headers, because
    // browser/Node native WebSocket constructors cannot set custom headers.
    const protocols = ["realtime", `openai-insecure-api-key.${this.config.apiKey}`, "openai-beta.realtime-v1"];
    const factory = this.config.wsFactory ?? defaultWsFactory;

    const socket = factory(url, protocols);
    const session: SpeechSession = {
      id: config.sessionId,
      mode: this.mode,
      config,
      startedAt: Date.now(),
    };
    this.sockets.set(session.id, socket);

    socket.addEventListener("open", () => {
      socket.send(
        JSON.stringify({
          type: "session.update",
          session: {
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            instructions:
              "You are the Universal Accessibility Bootstrap voice agent. Respond concisely and clearly.",
          },
        }),
      );
    });
    socket.addEventListener("close", () => {
      this.sockets.delete(session.id);
    });

    return session;
  }

  /**
   * Parses incoming OpenAI Realtime server events for this session's socket
   * into `SpeechEvent`s via a small internal queue + resolver bridge (the
   * standard event-to-async-iterable adapter pattern).
   *
   * The completed-transcript path (`conversation.item.input_audio_transcription.completed`)
   * is implemented against documented behavior. The incremental/partial
   * transcript path is best-effort: **NEEDS VERIFICATION against the live
   * API** — the exact event name and payload shape for streaming
   * (non-final) input-audio transcription deltas is not confirmed from
   * documentation alone at the time of writing (ADR-007's own convention
   * for flagging unverified vendor-API specifics is followed here).
   */
  async *transcribe(session: SpeechSession): AsyncIterable<SpeechEvent> {
    const socket = this.sockets.get(session.id);
    if (!socket) {
      yield { type: "error", code: "no-active-session", message: `No active realtime socket for session ${session.id}` };
      yield { type: "end" };
      return;
    }

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

    socket.addEventListener("message", (ev: any) => {
      let payload: any;
      try {
        payload = JSON.parse(ev.data);
      } catch {
        push({ type: "error", code: "malformed-message", message: "Could not parse realtime server event" });
        return;
      }

      switch (payload.type) {
        case "conversation.item.input_audio_transcription.completed":
          push({ type: "transcript", text: payload.transcript ?? "", isFinal: true, confidence: 1 });
          break;
        // NEEDS VERIFICATION against the live API: best-effort mapping,
        // modeled on OpenAI's other `*.delta` streaming event shapes. Not
        // confirmed to be the real partial-transcript event name/payload.
        case "conversation.item.input_audio_transcription.delta":
          push({ type: "transcript", text: payload.delta ?? "", isFinal: false, confidence: 0.5 });
          break;
        case "error":
          push({
            type: "error",
            code: payload.error?.code ?? "realtime-error",
            message: payload.error?.message ?? "Unknown realtime API error",
          });
          break;
        default:
          // Other server events (session.updated, response.*, rate limit
          // notices, etc.) are not transcript-relevant here and ignored.
          break;
      }
    });
    socket.addEventListener("close", () => {
      ended = true;
      push({ type: "end" });
    });

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
  }

  /**
   * Sends a `response.create` event carrying `text` as the response
   * instructions, then yields base64-decoded audio chunks from
   * `response.audio.delta` events until `response.audio.done` (or an
   * `error` event) arrives.
   */
  async *synthesize(session: SpeechSession, text: string): AsyncIterable<Uint8Array> {
    const socket = this.sockets.get(session.id);
    if (!socket) {
      return;
    }

    socket.send(
      JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["audio", "text"],
          instructions: text,
        },
      }),
    );

    const queue: Uint8Array[] = [];
    let wake: (() => void) | null = null;
    let done = false;

    const wakeUp = (): void => {
      if (wake) {
        const resolve = wake;
        wake = null;
        resolve();
      }
    };

    socket.addEventListener("message", (ev: any) => {
      let payload: any;
      try {
        payload = JSON.parse(ev.data);
      } catch {
        return;
      }

      if (payload.type === "response.audio.delta" && typeof payload.delta === "string") {
        queue.push(base64ToBytes(payload.delta));
        wakeUp();
      } else if (payload.type === "response.audio.done" || payload.type === "error") {
        done = true;
        wakeUp();
      }
    });

    while (true) {
      if (queue.length === 0) {
        if (done) {
          return;
        }
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
        continue;
      }
      yield queue.shift()!;
    }
  }

  /** Native barge-in (ADR-007): cancels the in-flight response on this session's socket. Idempotent. */
  async interrupt(sessionId: string): Promise<void> {
    const socket = this.sockets.get(sessionId);
    if (!socket) {
      return;
    }
    socket.send(JSON.stringify({ type: "response.cancel" }));
  }

  async healthCheck(): Promise<boolean> {
    const fetchImpl = this.config.fetchImpl ?? globalThis.fetch;
    if (!fetchImpl) {
      return false;
    }
    try {
      const response = await fetchImpl("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
