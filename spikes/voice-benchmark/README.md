# Voice Provider Benchmark Spike — WP-004

Research spike for ADR-007: benchmark realtime speech-to-speech vs. chained STT/TTS candidates
for Italian-language quality, first-token latency, barge-in behavior, and cost per session-minute.

This is **not production code**. Production voice implementation is WP-015 (`packages/voice/`).

## Candidates

| ID | Mode | Stack |
|---|---|---|
| `openai-realtime` | B (realtime) | OpenAI Realtime API (gpt-4o-realtime-preview) |
| `whisper-openai-tts` | A (chained) | OpenAI Whisper STT + OpenAI TTS |
| `azure-chained` | A (chained) | Azure Cognitive Services STT + Neural TTS (it-IT-ElsaNeural) |

## Setup

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env and fill in your API keys
```

## Running

```bash
# Dry run — no API keys needed, prints candidate metadata only
python run_benchmark.py --dry-run

# Full benchmark — requires API keys in .env
python run_benchmark.py

# Run a single probe
python run_benchmark.py --probe latency
python run_benchmark.py --probe accuracy
python run_benchmark.py --probe barge_in
python run_benchmark.py --probe cost

# Target a single candidate
python run_benchmark.py --candidate openai-realtime
```

Results are written to `results/YYYYMMDD-HHMMSS.json`.

## Generating audio fixtures

The benchmark scripts require `.wav` files corresponding to each utterance in
`fixtures/utterances-it.json`. Generate them once with any TTS (requires an API key):

```bash
python fixtures/generate_fixtures.py --tts openai   # uses OPENAI_API_KEY
python fixtures/generate_fixtures.py --tts azure    # uses AZURE_SPEECH_KEY + AZURE_SPEECH_REGION
```

Generated files land in `fixtures/audio/`. They are gitignored (binary assets).

## Test set

30 Italian utterances across 4 categories in `fixtures/utterances-it.json`:
- `navigation` — 8 utterances (e.g. "Vai alla pagina successiva")
- `form_dictation` — 8 utterances (e.g. "Il mio nome è Mario Rossi")
- `numbers_dates` — 7 utterances (e.g. "Il codice postale è zero uno zero zero zero")
- `free_form` — 7 utterances (general Italian sentences)

Ground-truth transcripts are stored in the JSON alongside each utterance.
**All audio is synthetic/TTS-generated — no real user data.**

## Security

- API keys are read from environment variables only; never hardcoded.
- No real user speech is used; all fixtures are synthetic.
- `results/` outputs contain transcripts of synthetic utterances only.

## Interpreting results

Each measurement in `results/*.json` carries a `verified` field:
- `true` — directly measured in this run
- `false` (tagged as NEEDS VERIFICATION in the report) — sourced from vendor documentation

See `aua/docs/architecture/voice-benchmark-report.md` for the full analysis and recommendation.
