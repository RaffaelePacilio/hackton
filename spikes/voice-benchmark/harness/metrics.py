"""
Metric calculations shared across all probes.
"""
from __future__ import annotations

import statistics
from typing import Sequence


def word_error_rate(hypothesis: str, reference: str) -> float:
    """Compute WER using jiwer. Returns 0.0–1.0 (lower is better)."""
    try:
        from jiwer import wer
        return wer(reference, hypothesis)
    except ImportError:
        # Fallback: simple token edit distance
        ref_tokens = reference.lower().split()
        hyp_tokens = hypothesis.lower().split()
        return _edit_distance(hyp_tokens, ref_tokens) / max(len(ref_tokens), 1)


def _edit_distance(a: list, b: list) -> int:
    m, n = len(a), len(b)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev = dp[:]
        dp[0] = i
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[j] = prev[j - 1]
            else:
                dp[j] = 1 + min(prev[j], dp[j - 1], prev[j - 1])
    return dp[n]


def latency_stats(samples_ms: Sequence[float]) -> dict:
    """Return p50, p95, mean, min, max from a list of latency samples in ms."""
    if not samples_ms:
        return {"p50": None, "p95": None, "mean": None, "min": None, "max": None}
    s = sorted(samples_ms)
    n = len(s)

    def percentile(p: float) -> float:
        idx = (p / 100) * (n - 1)
        lo, hi = int(idx), min(int(idx) + 1, n - 1)
        return s[lo] + (s[hi] - s[lo]) * (idx - lo)

    return {
        "p50": round(percentile(50), 1),
        "p95": round(percentile(95), 1),
        "mean": round(statistics.mean(s), 1),
        "min": round(s[0], 1),
        "max": round(s[-1], 1),
    }


def cost_per_session_minute(
    stt_cost_per_minute: float,
    tts_cost_per_1k_chars: float,
    avg_tts_chars_per_minute: float,
    overhead_multiplier: float = 1.0,
) -> float:
    """Estimate cost per session-minute for a chained pipeline.

    Args:
        stt_cost_per_minute: USD per minute of STT transcription.
        tts_cost_per_1k_chars: USD per 1000 characters of TTS synthesis.
        avg_tts_chars_per_minute: Average characters synthesized per minute.
        overhead_multiplier: Multiplier for API overhead (default 1.0).
    """
    tts_cost = (avg_tts_chars_per_minute / 1000) * tts_cost_per_1k_chars
    return round((stt_cost_per_minute + tts_cost) * overhead_multiplier, 6)


def cost_per_session_minute_realtime(
    realtime_cost_per_minute_input: float,
    realtime_cost_per_minute_output: float,
    input_fraction: float = 0.4,
) -> float:
    """Estimate cost per session-minute for a realtime API.

    Args:
        realtime_cost_per_minute_input: USD per minute of audio input.
        realtime_cost_per_minute_output: USD per minute of audio output.
        input_fraction: Fraction of session time spent sending (vs. receiving) audio.
    """
    output_fraction = 1.0 - input_fraction
    return round(
        realtime_cost_per_minute_input * input_fraction
        + realtime_cost_per_minute_output * output_fraction,
        6,
    )
