import type { MobileCommand, PairingChannelMessage, PairingChannelState } from "./types.js";

/**
 * The minimal surface of the WebSocket API this module depends on. Kept
 * narrow and dependency-injected (rather than referencing the global
 * `WebSocket` directly) so tests can supply a fake implementation without
 * needing a real socket or the `ws` npm package.
 */
export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(type: string, listener: (ev: any) => void): void;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

function defaultWebSocketFactory(url: string): WebSocketLike {
  const GlobalWebSocket = (globalThis as { WebSocket?: new (url: string) => WebSocketLike }).WebSocket;
  if (!GlobalWebSocket) {
    throw new Error("no-websocket-support");
  }
  return new GlobalWebSocket(url);
}

/**
 * Browser-extension side of the WebSocket session channel to the Session
 * Gateway (ADR-012). The mobile app is paired out-of-band via the Mobile
 * Pairing Service; once paired, commands are relayed to the extension over
 * this backend-relayed channel — never peer-to-peer.
 */
export class PairingChannel {
  private ws: WebSocketLike | null = null;
  state: PairingChannelState = "disconnected";

  constructor(
    private readonly wsUrl: string,
    private readonly sessionId: string,
    private readonly onMessage: (msg: PairingChannelMessage) => void,
    private readonly wsFactory: WebSocketFactory = defaultWebSocketFactory,
  ) {}

  connect(): void {
    this.state = "connecting";
    try {
      this.ws = this.wsFactory(this.wsUrl);
    } catch {
      this.state = "disconnected";
      this.onMessage({ type: "error", code: "no-websocket-support" });
      return;
    }

    this.ws.addEventListener("open", () => {
      this.state = "connected";
    });
    this.ws.addEventListener("message", (ev: any) => {
      try {
        const parsed = JSON.parse(ev.data) as PairingChannelMessage;
        this.onMessage(parsed);
      } catch {
        this.onMessage({ type: "error", code: "malformed-message" });
      }
    });
    this.ws.addEventListener("error", () => {
      this.onMessage({ type: "error", code: "ws-error" });
    });
    this.ws.addEventListener("close", () => {
      this.state = "disconnected";
    });
  }

  disconnect(): void {
    this.ws?.close();
    this.state = "disconnected";
    this.ws = null;
  }

  /**
   * Sends a mobile-originated command to the Session Gateway. A silent
   * no-op when not connected — callers are not expected to buffer/queue;
   * the mobile app surfaces its own "not paired" state instead.
   */
  send(command: MobileCommand): void {
    if (this.state !== "connected" || !this.ws) {
      return;
    }
    this.ws.send(JSON.stringify({ type: "command", command } satisfies PairingChannelMessage));
  }
}
