import type { UserIntent } from "@aua/contracts";

/**
 * Ephemeral, single-use pairing token minted by the browser extension and
 * exchanged through the backend Mobile Pairing Service (ADR-012). Never
 * transmitted peer-to-peer.
 */
export interface PairingToken {
  token: string;
  expiresAt: number;
  sessionId: string;
  used: boolean;
}

/**
 * The QR/numeric-code presentation of a pairing token. Both encodings carry
 * the same underlying single-use token — the numeric code exists purely as
 * a fallback input path when scanning a QR code isn't practical.
 */
export interface PairingCode {
  numericCode: string;
  qrData: string;
  token: PairingToken;
}

/**
 * A command relayed from the paired mobile app to the browser extension via
 * the Session Gateway. Per the ADR-012 threat model (confused deputy), the
 * mobile app never receives raw page content or unrestricted browser
 * control — it only ever sends `UserIntent`-shaped commands, exactly like
 * voice input, subject to the same capability-class confirmation policy.
 */
export interface MobileCommand {
  type: "user-intent";
  intent: UserIntent;
  sessionId: string;
  commandId: string;
}

/**
 * Messages exchanged over the backend-relayed WebSocket session channel to
 * the Session Gateway.
 */
export type PairingChannelMessage =
  | { type: "paired"; sessionId: string }
  | { type: "command"; command: MobileCommand }
  | { type: "heartbeat" }
  | { type: "error"; code: string };

export type PairingChannelState = "disconnected" | "connecting" | "connected";
