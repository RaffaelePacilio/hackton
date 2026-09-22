import type { PairingCode, PairingToken } from "./types.js";

const DEFAULT_TTL_MS = 120_000;
const NUMERIC_CODE_MODULUS = 1_000_000;
const NUMERIC_CODE_DIGITS = 6;

/**
 * Mints a new ephemeral, single-use pairing token for a browser session
 * (ADR-012: ~2 minute TTL by default, single-use, revocable via the
 * backend Mobile Pairing Service).
 */
export function generatePairingToken(sessionId: string, ttlMs: number = DEFAULT_TTL_MS): PairingToken {
  return {
    token: crypto.randomUUID(),
    expiresAt: Date.now() + ttlMs,
    sessionId,
    used: false,
  };
}

/**
 * Deterministic FNV-1a-style hash over a string, used to derive the 6-digit
 * fallback numeric code from a pairing token. Pure and dependency-free —
 * the same token string always yields the same numeric code.
 */
function fnv1aHash(input: string): number {
  let hash = 0x811c9dc5; // FNV offset basis (32-bit)
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // hash *= FNV prime (0x01000193), done with shifts to stay in int32 range
    hash =
      (hash +
        ((hash << 1) >>> 0) +
        ((hash << 4) >>> 0) +
        ((hash << 7) >>> 0) +
        ((hash << 8) >>> 0) +
        ((hash << 24) >>> 0)) >>>
      0;
  }
  return hash >>> 0;
}

/**
 * Derives the QR code payload and 6-digit fallback numeric code for a
 * pairing token. Both encodings are presentations of the same single-use
 * token — pairing succeeds via either path.
 */
export function generatePairingCode(token: PairingToken): PairingCode {
  const hash = fnv1aHash(token.token);
  const numericCode = String(hash % NUMERIC_CODE_MODULUS).padStart(NUMERIC_CODE_DIGITS, "0");

  return {
    numericCode,
    qrData: JSON.stringify({
      token: token.token,
      sessionId: token.sessionId,
      expiresAt: token.expiresAt,
    }),
    token,
  };
}

/**
 * A token is valid only while unused and before its TTL expires. Per the
 * ADR-012 threat model, tokens are single-use and invalidated immediately
 * on first successful pairing.
 */
export function isTokenValid(token: PairingToken): boolean {
  if (token.used) {
    return false;
  }
  return token.expiresAt > Date.now();
}

/**
 * Marks a token as used. Returns a new object — the original is never
 * mutated — enforcing single-use/replay-prevention semantics explicitly at
 * the call site rather than via hidden mutation.
 */
export function markTokenUsed(token: PairingToken): PairingToken {
  return { ...token, used: true };
}
