/**
 * Sentinel returned by {@link raceWithTimeout} when the timeout wins the
 * race. A unique symbol rather than e.g. `"__timeout__"` so it can never
 * collide with a legitimate value a strategy's read function returns
 * (including `null`, which is itself a meaningful "gone" signal distinct
 * from "timed out").
 */
export const TIMEOUT_SENTINEL = Symbol("verification-engine.timeout");

/**
 * Runs `fn()` against a bounded clock: whichever settles first — the
 * caller-supplied read (DOM read, route read, state capture, adapter
 * presence check) or the timeout — decides the outcome. Every verification
 * strategy in this package (`dom-read`, `route-check`, `state-diff`,
 * `accessibility-check`) needs exactly this shape, so it lives here once
 * instead of four times.
 */
export function raceWithTimeout<T>(
  fn: () => Promise<T> | T,
  timeoutMs: number,
): Promise<T | typeof TIMEOUT_SENTINEL> {
  return Promise.race([
    Promise.resolve().then(fn),
    new Promise<typeof TIMEOUT_SENTINEL>((resolve) => {
      setTimeout(() => resolve(TIMEOUT_SENTINEL), timeoutMs);
    }),
  ]);
}
