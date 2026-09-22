// TODO SYNC-1: replace createNullTransport with import from @aua/shared

interface BackendTransport {
  send(msg: unknown): Promise<unknown>;
  isAvailable(): Promise<boolean>;
}

function createNullTransport(): BackendTransport {
  return {
    async send() {
      return { type: "degraded-mode", reason: "provider-unavailable" };
    },
    async isAvailable() {
      return false;
    },
  };
}

export let DEGRADED_MODE = false;

export class ServiceWorkerSession {
  readonly sessionId: string;
  private readonly transport: BackendTransport;

  constructor(transport: BackendTransport = createNullTransport()) {
    this.sessionId = crypto.randomUUID();
    this.transport = transport;
  }

  async install(): Promise<void> {
    const available = await this.transport.isAvailable();
    DEGRADED_MODE = !available;
  }

  async activate(): Promise<void> {
    // Claim all clients immediately so the extension UI always reflects the
    // current session without requiring a page reload.
    if (typeof clients !== "undefined") {
      await clients.claim();
    }
  }

  handleMessage(msg: unknown, sendResponse: (response: unknown) => void): boolean {
    if (typeof msg !== "object" || msg === null) {
      sendResponse({ error: "invalid-message" });
      return false;
    }
    const typed = msg as Record<string, unknown>;
    switch (typed["type"]) {
      case "AUA_HEALTH_CHECK":
        sendResponse({ degraded: DEGRADED_MODE, sessionId: this.sessionId });
        break;
      default:
        // Unknown message types are silently dropped — no unhandled exceptions
        sendResponse({ error: "unknown-type" });
    }
    return false;
  }
}

// Guard Chrome/SW APIs — absent in test environments (jsdom has no chrome global)
if (typeof chrome !== "undefined" && chrome?.runtime) {
  const session = new ServiceWorkerSession();

  self.addEventListener("install", (event) => {
    (event as ExtendableEvent).waitUntil(session.install());
  });

  self.addEventListener("activate", (event) => {
    (event as ExtendableEvent).waitUntil(session.activate());
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    return session.handleMessage(msg, sendResponse);
  });
}
