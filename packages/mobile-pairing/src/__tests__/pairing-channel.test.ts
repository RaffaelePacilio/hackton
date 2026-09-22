import { describe, expect, it, vi } from "vitest";
import { PairingChannel, type WebSocketFactory, type WebSocketLike } from "../pairing-channel.js";
import type { MobileCommand, PairingChannelMessage } from "../types.js";

/** Minimal hand-rolled event-emitter stub standing in for a real WebSocket. */
class FakeWebSocket implements WebSocketLike {
  readyState = 0;
  sent: string[] = [];
  private listeners = new Map<string, ((ev: any) => void)[]>();

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.emit("close", {});
  }

  addEventListener(type: string, listener: (ev: any) => void): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  emit(type: string, ev: any): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(ev);
    }
  }
}

describe("PairingChannel", () => {
  it("transitions connecting -> connected on the underlying socket's open event", () => {
    const onMessage = vi.fn();
    let socket!: FakeWebSocket;
    const factory: WebSocketFactory = () => {
      socket = new FakeWebSocket();
      return socket;
    };
    const channel = new PairingChannel("wss://gateway.example/session-1", "session-1", onMessage, factory);

    channel.connect();
    expect(channel.state).toBe("connecting");

    socket.emit("open", {});
    expect(channel.state).toBe("connected");
  });

  it("parses a valid JSON message event and forwards it to onMessage", () => {
    const onMessage = vi.fn();
    let socket!: FakeWebSocket;
    const factory: WebSocketFactory = () => {
      socket = new FakeWebSocket();
      return socket;
    };
    const channel = new PairingChannel("wss://gateway.example/session-1", "session-1", onMessage, factory);
    channel.connect();
    socket.emit("open", {});

    const message: PairingChannelMessage = { type: "paired", sessionId: "session-1" };
    socket.emit("message", { data: JSON.stringify(message) });

    expect(onMessage).toHaveBeenCalledWith(message);
  });

  it("reports a malformed-message error when the message event contains invalid JSON", () => {
    const onMessage = vi.fn();
    let socket!: FakeWebSocket;
    const factory: WebSocketFactory = () => {
      socket = new FakeWebSocket();
      return socket;
    };
    const channel = new PairingChannel("wss://gateway.example/session-1", "session-1", onMessage, factory);
    channel.connect();
    socket.emit("open", {});

    socket.emit("message", { data: "{not-valid-json" });

    expect(onMessage).toHaveBeenCalledWith({ type: "error", code: "malformed-message" });
  });

  it("closes the underlying socket and sets state to disconnected on disconnect()", () => {
    const onMessage = vi.fn();
    let socket!: FakeWebSocket;
    const factory: WebSocketFactory = () => {
      socket = new FakeWebSocket();
      return socket;
    };
    const channel = new PairingChannel("wss://gateway.example/session-1", "session-1", onMessage, factory);
    channel.connect();
    socket.emit("open", {});
    expect(channel.state).toBe("connected");

    const closeSpy = vi.spyOn(socket, "close");
    channel.disconnect();

    expect(closeSpy).toHaveBeenCalled();
    expect(channel.state).toBe("disconnected");
  });

  it("send() is a silent no-op when not connected", () => {
    const onMessage = vi.fn();
    let socket!: FakeWebSocket;
    const factory: WebSocketFactory = () => {
      socket = new FakeWebSocket();
      return socket;
    };
    const channel = new PairingChannel("wss://gateway.example/session-1", "session-1", onMessage, factory);
    channel.connect();
    // deliberately do not emit "open" — channel stays in "connecting" state

    const command: MobileCommand = {
      type: "user-intent",
      commandId: "cmd-1",
      sessionId: "session-1",
      intent: {
        intentId: "intent-1",
        intent: "activate-action",
        confidence: 0.9,
      },
    };

    expect(() => channel.send(command)).not.toThrow();
    expect(socket.sent).toHaveLength(0);
  });

  it("send() delivers the command over the socket once connected", () => {
    const onMessage = vi.fn();
    let socket!: FakeWebSocket;
    const factory: WebSocketFactory = () => {
      socket = new FakeWebSocket();
      return socket;
    };
    const channel = new PairingChannel("wss://gateway.example/session-1", "session-1", onMessage, factory);
    channel.connect();
    socket.emit("open", {});

    const command: MobileCommand = {
      type: "user-intent",
      commandId: "cmd-1",
      sessionId: "session-1",
      intent: {
        intentId: "intent-1",
        intent: "activate-action",
        confidence: 0.9,
      },
    };
    channel.send(command);

    expect(socket.sent).toHaveLength(1);
    expect(JSON.parse(socket.sent[0])).toEqual({ type: "command", command });
  });

  it("reports a ws-error when the underlying socket emits an error event", () => {
    const onMessage = vi.fn();
    let socket!: FakeWebSocket;
    const factory: WebSocketFactory = () => {
      socket = new FakeWebSocket();
      return socket;
    };
    const channel = new PairingChannel("wss://gateway.example/session-1", "session-1", onMessage, factory);
    channel.connect();

    socket.emit("error", {});

    expect(onMessage).toHaveBeenCalledWith({ type: "error", code: "ws-error" });
  });

  it("reports no-websocket-support when the factory throws (e.g. no global WebSocket)", () => {
    const onMessage = vi.fn();
    const factory: WebSocketFactory = () => {
      throw new Error("WebSocket is not defined");
    };
    const channel = new PairingChannel("wss://gateway.example/session-1", "session-1", onMessage, factory);

    channel.connect();

    expect(channel.state).toBe("disconnected");
    expect(onMessage).toHaveBeenCalledWith({ type: "error", code: "no-websocket-support" });
  });
});
