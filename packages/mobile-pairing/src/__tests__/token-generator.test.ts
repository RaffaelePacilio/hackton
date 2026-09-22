import { describe, expect, it } from "vitest";
import {
  generatePairingCode,
  generatePairingToken,
  isTokenValid,
  markTokenUsed,
} from "../token-generator.js";
import type { PairingToken } from "../types.js";

describe("generatePairingToken", () => {
  it("defaults to a ~2 minute TTL (ADR-012)", () => {
    const before = Date.now();
    const token = generatePairingToken("session-1");
    const after = Date.now();

    expect(token.sessionId).toBe("session-1");
    expect(token.used).toBe(false);
    expect(token.expiresAt).toBeGreaterThanOrEqual(before + 120_000);
    expect(token.expiresAt).toBeLessThanOrEqual(after + 120_000);
  });

  it("honors a custom TTL", () => {
    const before = Date.now();
    const token = generatePairingToken("session-1", 5_000);
    expect(token.expiresAt).toBeGreaterThanOrEqual(before + 5_000);
    expect(token.expiresAt).toBeLessThanOrEqual(before + 5_000 + 50);
  });

  it("mints a unique token string per call", () => {
    const a = generatePairingToken("session-1");
    const b = generatePairingToken("session-1");
    expect(a.token).not.toBe(b.token);
  });
});

describe("isTokenValid", () => {
  function makeToken(overrides: Partial<PairingToken> = {}): PairingToken {
    return {
      token: "token-1",
      sessionId: "session-1",
      expiresAt: Date.now() + 60_000,
      used: false,
      ...overrides,
    };
  }

  it("is true for a fresh, unused, unexpired token", () => {
    expect(isTokenValid(makeToken())).toBe(true);
  });

  it("is false when the token has been used", () => {
    expect(isTokenValid(makeToken({ used: true }))).toBe(false);
  });

  it("is false when the token has expired", () => {
    expect(isTokenValid(makeToken({ expiresAt: Date.now() - 1 }))).toBe(false);
  });

  it("is false when the token is both used and expired", () => {
    expect(isTokenValid(makeToken({ used: true, expiresAt: Date.now() - 1 }))).toBe(false);
  });
});

describe("markTokenUsed", () => {
  it("returns a new object with used: true, without mutating the original", () => {
    const original = generatePairingToken("session-1");
    const updated = markTokenUsed(original);

    expect(updated).not.toBe(original);
    expect(updated.used).toBe(true);
    expect(original.used).toBe(false);
    expect(updated.token).toBe(original.token);
    expect(updated.sessionId).toBe(original.sessionId);
    expect(updated.expiresAt).toBe(original.expiresAt);
  });
});

describe("generatePairingCode", () => {
  it("derives a 6-digit numeric code, zero-padded, across many tokens", () => {
    for (let i = 0; i < 500; i++) {
      const token = generatePairingToken(`session-${i}`);
      const code = generatePairingCode(token);
      expect(code.numericCode).toMatch(/^\d{6}$/);
    }
  });

  it("is deterministic for the same token string", () => {
    const token = generatePairingToken("session-1");
    const codeA = generatePairingCode(token);
    const codeB = generatePairingCode(token);
    expect(codeA.numericCode).toBe(codeB.numericCode);
  });

  it("produces qrData that round-trips via JSON.parse", () => {
    const token = generatePairingToken("session-1");
    const code = generatePairingCode(token);
    const parsed = JSON.parse(code.qrData);

    expect(parsed).toEqual({
      token: token.token,
      sessionId: token.sessionId,
      expiresAt: token.expiresAt,
    });
  });

  it("carries the original token through unchanged", () => {
    const token = generatePairingToken("session-1");
    const code = generatePairingCode(token);
    expect(code.token).toBe(token);
  });
});
