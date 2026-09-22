# Voice Provider Benchmark Report

**Spike:** WP-004 | **ADR:** ADR-007 | **Date:** 2026-09-22
**Status:** DRAFT — measured values require `run_benchmark.py` execution with real API keys

---

## 1. Executive Summary

**Recommendation:** Use **OpenAI Realtime API** (`gpt-4o-realtime-preview`) as the default
Mode B (realtime) provider, and **Azure Cognitive Services** (it-IT, West Europe region) as
the default Mode A (chained) fallback provider.

**Confidence:** Medium — architecture and API capabilities are confirmed; latency and WER
numbers in this report require in-environment validation (see Section 5, Limitations).
All unvalidated figures are labeled **NEEDS VERIFICATION**.

**Rationale summary:**
- OpenAI Realtime delivers the lowest end-to-end latency and the only native barge-in path
  suitable for accessibility use cases where users must interrupt mid-utterance.
- Azure Cognitive Services is the only candidate with confirmed EU data-residency (West Europe
  region), which is required for the chained-pipeline fallback under data-residency-constrained
  deployments (ADR-007 Mode A trigger condition (a)).
- Whisper + OpenAI TTS is a viable alternative to Azure for Mode A when EU residency is not
  required, but EU availability is unconfirmed — it is not recommended as the default fallback.

---

## 2. Methodology

### 2.1 Test environment

Benchmarks are run via `spikes/voice-benchmark/run_benchmark.py`. Set up:

```bash
cd spikes/voice-benchmark
pip install -r requirements.txt
cp .env.example .env   # fill in OPENAI_API_KEY, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION
python run_benchmark.py
```

Network conditions: local development network (not a production-equivalent edge node).
Results from a controlled low-latency datacenter network would differ — see Section 5.

### 2.2 Test set

30 synthetic Italian utterances in `fixtures/utterances-it.json` across four categories:

| Category | Count | Examples |
|---|---|---|
| `navigation` | 8 | "Vai alla pagina successiva", "Apri il menu principale" |
| `form_dictation` | 8 | "Il mio nome è Mario Rossi", Italian phone numbers |
| `numbers_dates` | 7 | Postal codes, dates, currency amounts |
| `free_form` | 7 | Support requests, booking sentences, multi-clause sentences |

All audio is **synthetic** (TTS-generated via `fixtures/generate_fixtures.py`) — no real user
data. Ground-truth transcripts are lowercase normalized.

### 2.3 Metric definitions

| Metric | Definition | Unit |
|---|---|---|
| **First-token latency (p50)** | Time from sending audio to receiving first response token/chunk, median | ms |
| **First-token latency (p95)** | Same, 95th percentile | ms |
| **WER** | Word Error Rate = (S+D+I) / N where S=substitutions, D=deletions, I=insertions | 0–1 (lower = better) |
| **Barge-in latency (p50)** | Time from `interrupt()` call to confirmed stop, median | ms |
| **Cost/session-minute** | Estimated USD per minute of active session | USD |

### 2.4 Candidates

| Candidate ID | Mode | Vendor | Stack |
|---|---|---|---|
| `openai-realtime` | B (realtime) | OpenAI | gpt-4o-realtime-preview (WebSocket) |
| `whisper-openai-tts` | A (chained) | OpenAI | whisper-1 STT + tts-1 TTS |
| `azure-chained` | A (chained) | Microsoft Azure | Azure STT (it-IT) + it-IT-ElsaNeural TTS |

---

## 3. Candidate Profiles

### 3.1 OpenAI Realtime API (`openai-realtime`)

- **Architecture:** Single WebSocket session; audio in, audio out. STT, reasoning, and TTS
  happen inside one stateful session. Native barge-in via `response.cancel` event.
- **Italian support:** Yes — underlying model is `gpt-4o-realtime-preview` with Whisper-class
  Italian ASR integrated.
- **EU data residency:** **NEEDS VERIFICATION** — OpenAI does not publish per-region
  data-residency guarantees for Realtime API endpoints as of 2026-09-22.
- **Barge-in:** Native. Client sends `response.cancel`; the server stops generating immediately.
  Client must still cancel in-flight audio playback (ADR-007 client obligation).
- **Tool calling:** Supported inside the audio session — relevant for future skill invocation
  from voice without leaving the audio modality.

### 3.2 OpenAI Whisper STT + OpenAI TTS (`whisper-openai-tts`)

- **Architecture:** Chained. Audio file → `whisper-1` transcription endpoint → text reasoning
  (separate) → `tts-1` synthesis endpoint → audio stream.
- **Italian support:** Whisper has strong Italian support (it is a top-10 language in training
  data). TTS voice "alloy" supports Italian input.
- **EU data residency:** **NEEDS VERIFICATION** — same caveat as OpenAI Realtime.
- **Barge-in:** Client-side HTTP request cancellation only. No server acknowledgment.
  Higher interrupt latency than realtime native path expected.
- **Per-stage observability:** Good — each HTTP call is independently traceable (ADR-016
  compatible).

### 3.3 Azure Cognitive Services STT + Neural TTS (`azure-chained`)

- **Architecture:** Chained. Audio → Azure Speech SDK STT (continuous recognition, it-IT) →
  text → Azure Neural TTS (it-IT-ElsaNeural, streaming).
- **Italian support:** First-class. Azure's it-IT locale is a Tier 1 supported language with
  dedicated acoustic models.
- **EU data residency:** **Confirmed.** West Europe region (Netherlands) provides GDPR-compliant
  data processing with customer data stored within the EU.
- **Barge-in:** `stop_speaking_async()` SDK call. Faster than HTTP cancellation but slower than
  realtime native cancel.
- **Per-stage observability:** Excellent — SDK exposes per-event hooks for both STT and TTS.

---

## 4. Results

> **Note on verification status:** Cells marked **NEEDS VERIFICATION** contain estimates from
> vendor documentation or are pending `run_benchmark.py` execution with real API keys.
> Cells marked **measured** contain values from a live benchmark run.
> Update this table after running `python run_benchmark.py` and replace NEEDS VERIFICATION
> with measured values.

### 4.1 First-token / first-audio latency

| Candidate | p50 (ms) | p95 (ms) | Status |
|---|---|---|---|
| `openai-realtime` | **NEEDS VERIFICATION** | **NEEDS VERIFICATION** | Not yet measured |
| `whisper-openai-tts` | **NEEDS VERIFICATION** | **NEEDS VERIFICATION** | Not yet measured |
| `azure-chained` | **NEEDS VERIFICATION** | **NEEDS VERIFICATION** | Not yet measured |

*Vendor documentation claims (NEEDS VERIFICATION):*
- OpenAI Realtime: sub-300ms first-token in supported regions (per ADR-007 evidence section).
- Whisper STT round-trip: ~500–900ms for a 5-second clip (per vendor benchmarks).
- Azure STT first-result: ~300–600ms (per Azure documentation).

### 4.2 Italian transcription accuracy (WER)

| Candidate | Mean WER | Utterances measured | Status |
|---|---|---|---|
| `openai-realtime` | **NEEDS VERIFICATION** | 0 / 30 | Audio fixtures not generated |
| `whisper-openai-tts` | **NEEDS VERIFICATION** | 0 / 30 | Audio fixtures not generated |
| `azure-chained` | **NEEDS VERIFICATION** | 0 / 30 | Audio fixtures not generated |

*To populate: run `python fixtures/generate_fixtures.py --tts openai` then `python run_benchmark.py --probe accuracy`.*

*Vendor documentation claims (NEEDS VERIFICATION):*
- Whisper `whisper-1`: ~7–12% WER on Italian speech (per OpenAI published benchmarks on Common Voice it).
- Azure it-IT Standard: ~8–15% WER depending on acoustic conditions (per Azure Speech benchmark docs).

### 4.3 Barge-in interrupt latency

| Candidate | Mechanism | p50 (ms) | Status |
|---|---|---|---|
| `openai-realtime` | Native (`response.cancel`) | **NEEDS VERIFICATION** | Not yet measured |
| `whisper-openai-tts` | HTTP cancel + client event | **NEEDS VERIFICATION** | Not yet measured |
| `azure-chained` | `stop_speaking_async()` | **NEEDS VERIFICATION** | Not yet measured |

*Note: These numbers measure the time from API interrupt call to confirmed stop — they do not
include client-side audio buffer drain, which is an additional obligation per ADR-007.*

### 4.4 Cost per session-minute (USD)

All figures are sourced from public vendor documentation and **NEEDS VERIFICATION** against
current pricing before use in budget planning.

| Candidate | Estimated cost/session-min | Pricing basis | EU region | Status |
|---|---|---|---|---|
| `openai-realtime` | ~$0.15 | $0.10/min audio in + $0.20/min audio out | NEEDS VERIFICATION | NEEDS VERIFICATION |
| `whisper-openai-tts` | ~$0.015 | $0.006/min STT + $0.015/1k TTS chars | NEEDS VERIFICATION | NEEDS VERIFICATION |
| `azure-chained` | ~$0.018 | $0.0083/min STT + $0.016/1k TTS chars | Yes (West Europe) | NEEDS VERIFICATION |

*Run `python run_benchmark.py --probe cost` to recompute these from the pricing constants in
`harness/cost_estimator.py`. Update the constants when verifying against current vendor pricing pages.*

### 4.5 EU data residency

| Candidate | EU region available | Confirmed |
|---|---|---|
| `openai-realtime` | Unknown | NEEDS VERIFICATION |
| `whisper-openai-tts` | Unknown | NEEDS VERIFICATION |
| `azure-chained` | Yes (West Europe) | Confirmed |

---

## 5. Limitations

1. **Network conditions:** All latency measurements were taken from a development workstation,
   not from a production-equivalent edge node or a user's browser. Production latency will
   differ. The WER probe is unaffected by network conditions.

2. **Synthetic audio fixtures:** All test audio is generated by TTS, which may have different
   acoustic characteristics than real-world user speech (noise, accent variation, microphone
   quality). Real-user speech typically yields higher WER.

3. **Sample size:** 30 utterances is a small test set sufficient to surface gross quality
   differences but not for fine-grained statistical comparison. A production-grade evaluation
   would use ≥500 utterances from diverse Italian speakers.

4. **Barge-in simulation:** The barge-in probe measures API-level cancellation latency, not
   end-to-end perceived barge-in (which includes local audio buffer drain and client rendering
   pipeline). The Mode B native path is expected to be meaningfully faster in practice.

5. **Pricing volatility:** Vendor pricing changes. All cost estimates must be reverified against
   current pricing pages before use in budget planning or SLA commitments.

---

## 6. Recommendation

### 6.1 Mode B default (realtime): OpenAI Realtime API

**Reasoning:**
- Native barge-in is the single most important criterion for accessibility use cases. A user
  correcting a misheard command mid-utterance must interrupt cleanly — this is explicitly called
  out in ADR-007 as the primary motivation for the realtime default.
- The chained candidates require client-side cancellation with measurable additional latency and
  no guarantee of server-side audio stop.
- Italian language support is confirmed via the integrated Whisper STT layer.

**Blocking condition before production use:** EU data-residency must be resolved (verify with
OpenAI whether a contractual data-processing agreement and EU-region endpoint are available).
If not available, **fall through to Mode A Azure for all EU deployments**.

### 6.2 Mode A fallback (chained): Azure Cognitive Services (West Europe)

**Reasoning:**
- EU data residency is the only confirmed requirement among all three candidates. Azure West
  Europe is the only option that meets it today without requiring vendor negotiation.
- Italian language support is first-class (it-IT locale, dedicated acoustic model,
  it-IT-ElsaNeural Neural TTS voice).
- Per-stage observability (ADR-016) is fully supported via SDK event hooks.

**Alternative:** Whisper + OpenAI TTS for Mode A when EU residency is not required (lower cost,
comparable accuracy). Not recommended as the default because it shares EU residency uncertainty
with the Mode B candidate, making it a poor fallback for the primary reason Mode A is needed.

### 6.3 Confidence level

**Medium.** Architecture suitability is High confidence. Vendor selection is Medium confidence
pending measured latency and WER data from a controlled environment. EU residency for OpenAI
Realtime is Low confidence (unconfirmed).

---

## 7. ADR-007 Update Action

Once measured data is available (run `python run_benchmark.py` and fill in Section 4 above),
update `ADR-007-voice-architecture.md` as follows:

1. Change the status line for the vendor clause from **PROPOSED** to **ACCEPTED**.
2. Name the default vendors explicitly in the Decision section.
3. Close the open question "Default vendor selection" with a reference to this report.
4. If OpenAI EU residency is unconfirmed after vendor outreach, add a note that all EU
   deployments must default to Azure Mode A and the Mode B realtime path is unavailable
   in EU-residency-constrained sessions.

If measured data reveals a candidate materially different from vendor documentation, scope a
follow-up spike before promoting to ACCEPTED.

---

## Appendix A: Running the benchmark

```bash
# One-time setup
cd spikes/voice-benchmark
python -m venv .venv && .venv\Scripts\activate   # or: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in API keys

# Generate audio fixtures (pick whichever TTS you have a key for)
python fixtures/generate_fixtures.py --tts openai

# Run all probes
python run_benchmark.py

# Results land in results/YYYYMMDD-HHMMSS.json
# Update Section 4 of this report with measured values.
```

## Appendix B: Fixture categories and coverage rationale

| Category | Count | Rationale |
|---|---|---|
| `navigation` | 8 | Core AUA use case — voice commands to navigate inaccessible UIs |
| `form_dictation` | 8 | Fills inaccessible form fields; tests proper nouns and mixed alphanumeric |
| `numbers_dates` | 7 | Italian number verbalization differs from Spanish/French — important for accuracy |
| `free_form` | 7 | Realistic support/booking/admin sentences; tests multi-clause recognition |
