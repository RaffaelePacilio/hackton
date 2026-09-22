"""
Cost per session-minute estimator.

IMPORTANT: All pricing figures below are sourced from public vendor documentation
and are marked verified=False (NEEDS VERIFICATION). They must be confirmed against
current vendor pricing pages before being cited in the benchmark report.

Pricing sources (retrieved 2026-09-22 — verify before use):
  - OpenAI Realtime API: https://openai.com/api/pricing
  - OpenAI Whisper / TTS: https://openai.com/api/pricing
  - Azure Cognitive Services Speech: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/
"""
from __future__ import annotations

from .metrics import cost_per_session_minute, cost_per_session_minute_realtime

# ---------------------------------------------------------------------------
# Vendor pricing tables (NEEDS VERIFICATION — sourced from public docs)
# ---------------------------------------------------------------------------

_PRICING: dict[str, dict] = {
    "openai-realtime": {
        "model": "gpt-4o-realtime-preview",
        "mode": "realtime",
        "audio_input_per_minute_usd": 0.10,   # NEEDS VERIFICATION
        "audio_output_per_minute_usd": 0.20,  # NEEDS VERIFICATION
        "source": "vendor-docs",
        "verified": False,
    },
    "whisper-openai-tts": {
        "stt_model": "whisper-1",
        "tts_model": "tts-1",
        "mode": "chained",
        "stt_cost_per_minute_usd": 0.006,           # NEEDS VERIFICATION
        "tts_cost_per_1k_chars_usd": 0.015,         # NEEDS VERIFICATION
        "avg_tts_chars_per_session_minute": 600,     # ~100 wpm × 6 chars/word
        "source": "vendor-docs",
        "verified": False,
    },
    "azure-chained": {
        "stt_model": "Azure Speech Standard (it-IT)",
        "tts_model": "it-IT-ElsaNeural",
        "mode": "chained",
        "stt_cost_per_minute_usd": 0.0083,           # NEEDS VERIFICATION
        "tts_cost_per_1k_chars_usd": 0.016,          # NEEDS VERIFICATION (Neural, standard tier)
        "avg_tts_chars_per_session_minute": 600,
        "eu_region_available": True,
        "eu_region": "westeurope",
        "source": "vendor-docs",
        "verified": False,
    },
}


def estimate_all() -> dict:
    """Compute cost-per-session-minute estimates for all candidates."""
    results = {}

    for candidate_id, pricing in _PRICING.items():
        if pricing["mode"] == "realtime":
            cost = cost_per_session_minute_realtime(
                realtime_cost_per_minute_input=pricing["audio_input_per_minute_usd"],
                realtime_cost_per_minute_output=pricing["audio_output_per_minute_usd"],
            )
            results[candidate_id] = {
                "mode": "realtime",
                "cost_per_session_minute_usd": cost,
                "pricing_inputs": pricing,
                "verified": pricing["verified"],
                "note": "NEEDS VERIFICATION — sourced from vendor documentation, not measured",
            }
        else:
            cost = cost_per_session_minute(
                stt_cost_per_minute=pricing["stt_cost_per_minute_usd"],
                tts_cost_per_1k_chars=pricing["tts_cost_per_1k_chars_usd"],
                avg_tts_chars_per_minute=pricing["avg_tts_chars_per_session_minute"],
            )
            results[candidate_id] = {
                "mode": "chained",
                "cost_per_session_minute_usd": cost,
                "pricing_inputs": pricing,
                "verified": pricing["verified"],
                "eu_region_available": pricing.get("eu_region_available", False),
                "note": "NEEDS VERIFICATION — sourced from vendor documentation, not measured",
            }

    return {"probe": "cost", "results": results}


def run(candidates=None) -> dict:
    """Run the cost probe. `candidates` arg is accepted for API consistency but unused."""
    return estimate_all()
