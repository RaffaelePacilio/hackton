# ADR-007: Voice Architecture and STT/TTS Provider Strategy

**Status:** ACCEPTED (interface + dual-mode strategy), PROPOSED (default provider selection —
pending EU data-residency and Italian-language quality benchmarking)
**Date:** 2026-09-22 | **Owners:** Voice/STT/TTS Architect | **Evidence verification date:** 2026-09-22

## Context
Voice is a first-class subsystem (Section 3.9). Two materially different architectures exist
and must both be supported behind one interface.

## Evidence gathered

Realtime speech-to-speech APIs (the class exemplified by OpenAI's Realtime API) now provide
STT, reasoning-adjacent turn handling, and TTS as a single low-latency streaming session, with
sub-300ms first-token latency achievable in supported regions, native barge-in / overlap
handling, and built-in tool calling while remaining in audio mode, removing the need to hand-roll
voice-activity detection. Production guidance is explicit that client-side echo cancellation and
immediate cancellation of in-flight generation on detected user speech are required to make
barge-in work correctly in practice — this is an implementation obligation on our client, not
something the provider fully hides. The realtime approach trades some inspectability for
integration simplicity: intermediate STT/reasoning/TTS stages are less individually observable
than in a chained pipeline, which matters for audit/observability requirements (ADR-016).
Chained pipelines (dedicated STT vendor → text reasoning → dedicated TTS vendor) remain viable
and give more instrumentation surface per stage, at the cost of inter-service latency and
integration complexity.

## Architectural comparison

**Mode A — Chained pipeline** (Audio → STT → Intent Engine → TTS → Audio): more inspectable,
easier to swap individual stages independently, higher latency, better fit when a customer's EU
data-residency or auditability requirements demand per-stage vendor selection.

**Mode B — Realtime speech-to-speech session** (Audio ↕ realtime voice agent ↕ tools): lower
latency, native barge-in, simpler client integration, less per-stage observability, tool-calling
happens inside the audio session.

## Decision matrix

| Criterion (weight) | Mode A: Chained | Mode B: Realtime (default) |
|---|---|---|
| Latency (5) | 2 | 5 |
| Barge-in quality (5) | 2 (must build VAD) | 5 (native) |
| Per-stage observability/audit (4) | 5 | 2 |
| EU data-residency flexibility (4) | 5 (pick per-stage vendor) | 3 (depends on provider region support) |
| Implementation complexity (3, lower=better) | 2 | 4 |
| Vendor swap granularity (3) | 5 | 2 |

## Decision
Adopt a `SpeechProvider` interface (below) implemented by **both** modes. **Default runtime
mode is realtime speech-to-speech** for latency and barge-in quality, since accessibility use
cases are especially latency- and interruption-sensitive (a user correcting a misheard command
mid-utterance must be able to interrupt cleanly). **Chained-pipeline mode is the mandatory
fallback** for: (a) sessions where the resolved region/data-residency policy does not clear a
realtime provider, (b) provider outage, (c) explicit customer requirement for per-stage
auditability. The specific default vendor for each mode is marked **PROPOSED, NEEDS
VERIFICATION** pending a dedicated Italian-language quality and EU-region latency benchmark —
this ADR fixes the *architecture*, not the vendor contract.

```typescript
interface SpeechProvider {
  mode: "chained" | "realtime";
  startSession(config: SpeechSessionConfig): Promise<SpeechSession>;
  transcribe(session: SpeechSession): AsyncIterable<SpeechEvent>;
  synthesize(session: SpeechSession, text: string): AsyncIterable<Uint8Array>;
  interrupt(sessionId: string): Promise<void>;
  healthCheck(): Promise<boolean>;
}
```

Client obligations regardless of mode: enable device echo cancellation, cancel in-flight TTS
generation immediately on detected user speech (`interrupt()`), and discard any buffered
already-streamed-but-unheard audio on barge-in — these are required for correct behavior and are
not delegated to the provider.

## Failure modes / degraded mode
Realtime provider unreachable → automatic fallback to chained mode with a browser/OS-native STT
as last resort (works fully offline for basic commands, at reduced accuracy) → if both fail, the
Universal Accessibility Bootstrap's non-voice interaction paths remain available (ADR-001).

## Security/Privacy considerations
Raw audio and transcripts are session-scoped; retention policy is provider- and
contract-dependent and must be documented per deployment (ADR-015). Voice utterances
(`UserIntent.rawUtterance`) are not persisted beyond the active session.

## Consequences
Two provider implementations to maintain per mode; justified by the resilience requirement in
Section 16 (voice provider unavailable must not break the platform) and by data-residency
flexibility needs that a realtime-only architecture cannot satisfy uniformly across regions.

## Revisit triggers
Italian-language quality/latency benchmark results; any provider announcing EU-region realtime
availability with clearer data-retention guarantees.

## Open questions
- Default vendor selection for each mode — **IN PROGRESS**, benchmarking spike WP-004 is
  complete. See `docs/architecture/voice-benchmark-report.md` for methodology, candidate
  profiles, and preliminary recommendation.
  - **Preliminary recommendation (Medium confidence):**
    - Mode B default: **OpenAI Realtime API** (`gpt-4o-realtime-preview`)
    - Mode A fallback: **Azure Cognitive Services** (it-IT, West Europe region — EU residency confirmed)
  - **Blocking item before ACCEPTED:** Measured latency and WER values must be collected by
    running `spikes/voice-benchmark/run_benchmark.py` with real API keys and replacing the
    NEEDS VERIFICATION placeholders in the report. EU data-residency for OpenAI Realtime must
    also be confirmed with the vendor before the Mode B default can be used in EU-constrained
    deployments.

## References
Section 3.9. `docs/architecture/voice-benchmark-report.md` (WP-004 spike output).
