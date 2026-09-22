// src/background/service-worker.ts
function createNullTransport() {
  return {
    async send() {
      return { type: "degraded-mode", reason: "provider-unavailable" };
    },
    async isAvailable() {
      return false;
    }
  };
}
var DEGRADED_MODE = false;
var ServiceWorkerSession = class {
  constructor(transport = createNullTransport()) {
    this.sessionId = crypto.randomUUID();
    this.transport = transport;
  }
  async install() {
    const available = await this.transport.isAvailable();
    DEGRADED_MODE = !available;
  }
  async activate() {
    if (typeof clients !== "undefined") {
      await clients.claim();
    }
  }
  handleMessage(msg, sendResponse) {
    if (typeof msg !== "object" || msg === null) {
      sendResponse({ error: "invalid-message" });
      return false;
    }
    const typed = msg;
    switch (typed["type"]) {
      case "AUA_HEALTH_CHECK":
        sendResponse({ degraded: DEGRADED_MODE, sessionId: this.sessionId });
        break;
      default:
        sendResponse({ error: "unknown-type" });
    }
    return false;
  }
};
if (typeof chrome !== "undefined" && chrome?.runtime) {
  const session = new ServiceWorkerSession();
  self.addEventListener("install", (event) => {
    event.waitUntil(session.install());
  });
  self.addEventListener("activate", (event) => {
    event.waitUntil(session.activate());
  });
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    return session.handleMessage(msg, sendResponse);
  });
}
export {
  DEGRADED_MODE,
  ServiceWorkerSession
};
//# sourceMappingURL=service-worker.js.map
