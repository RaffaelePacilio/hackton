id: WP-004
title: Voice Provider Benchmark Spike
phase: Foundation
parallel_group: PG-0

goal: >
  Resolve the ADR-007 open question: benchmark realtime speech-to-speech vs. chained STT/TTS
  candidates for Italian-language quality, first-token latency, and barge-in behavior, and
  produce a data-backed vendor recommendation memo (not production code).

depends_on: []
blocks: [WP-015]

architecture_refs:
  - ADR-007

output_contracts:
  - Benchmark report feeding ADR-007's PROPOSED default-vendor decision to ACCEPTED

owned_paths:
  - docs/architecture/voice-benchmark-report.md
  - spikes/voice-benchmark/**

forbidden_paths:
  - packages/voice/** (production implementation is WP-015, not this spike)

responsibilities:
  - Stand up minimal test harnesses against at least one realtime speech-to-speech candidate and
    one chained-pipeline candidate.
  - Measure: first-token/first-audio latency, barge-in responsiveness, Italian transcription
    accuracy on a small labeled test set, cost per session-minute.
  - Explicitly mark any claim not backed by measured data as NEEDS VERIFICATION rather than
    inferring from vendor marketing copy.

non_goals:
  - No production SpeechProvider implementation (WP-015).
  - No mobile integration.

implementation_requirements:
  - Reproducible benchmark scripts checked into spikes/voice-benchmark/.

security_requirements:
  - No real user data in benchmark fixtures; synthetic/consented test audio only.

tests_required:
  unit: false
  integration: false
  e2e: false

acceptance_criteria:
  - A report with measured (not estimated) latency, accuracy, and cost numbers for at least 2
    candidates, and an explicit recommendation with confidence level.

deliverables:
  - docs/architecture/voice-benchmark-report.md

integration_notes:
  - This report is a direct input to promoting ADR-007 from PROPOSED to ACCEPTED for the
    default-vendor clause; WP-015 should not start production implementation against a specific
    vendor until this lands.

risks:
  - Benchmark environment not representative of production network conditions — document
    limitations explicitly rather than overstating confidence.

definition_of_done:
  - Report merged; ADR-007 updated to ACCEPTED with vendor named or a follow-up spike scoped.
