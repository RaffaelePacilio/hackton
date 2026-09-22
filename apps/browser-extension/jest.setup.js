// jsdom's window.crypto lacks randomUUID (unlike browsers and Node) — polyfill
// it from Node's native crypto module so code under test can rely on it.
const { randomUUID } = require("node:crypto");

if (typeof globalThis.crypto?.randomUUID !== "function") {
  globalThis.crypto.randomUUID = randomUUID;
}
