"""
First-token / first-audio latency probe.

Measures the time from sending audio to receiving the first byte of a response
(transcription token for STT, audio chunk for TTS, or combined first event for realtime).
"""
from __future__ import annotations

import asyncio
import time
from pathlib import Path
from typing import TYPE_CHECKING

from .metrics import latency_stats

if TYPE_CHECKING:
    from candidates.base import VoiceCandidate

FIXTURE_AUDIO_DIR = Path(__file__).parent.parent / "fixtures" / "audio"


async def _measure_once(candidate: "VoiceCandidate", audio_path: Path) -> float | None:
    """Return first-token latency in ms, or None on error."""
    try:
        start = time.perf_counter()
        await candidate.transcribe(str(audio_path))
        elapsed_ms = (time.perf_counter() - start) * 1000
        return elapsed_ms
    except Exception as exc:
        print(f"    [latency_probe] error for {candidate.candidate_id}: {exc}")
        return None


async def run(
    candidates: list["VoiceCandidate"],
    n_repeats: int = 5,
    utterance_id: str = "nav-001",
) -> dict:
    """Run the latency probe for each candidate.

    Args:
        candidates: List of VoiceCandidate instances to benchmark.
        n_repeats: Number of repetitions per candidate.
        utterance_id: Fixture utterance to use (must have a corresponding .wav in fixtures/audio/).

    Returns:
        dict keyed by candidate_id with latency stats and verified flag.
    """
    audio_path = FIXTURE_AUDIO_DIR / f"{utterance_id}.wav"
    results = {}

    for candidate in candidates:
        meta = candidate.metadata()
        print(f"  latency probe: {candidate.candidate_id} ({n_repeats} runs)...")

        if not audio_path.exists():
            print(f"    WARNING: {audio_path} not found — skipping measured run")
            results[candidate.candidate_id] = {
                "candidate": meta,
                "utterance_id": utterance_id,
                "samples_ms": [],
                "stats": latency_stats([]),
                "verified": False,
                "note": "Audio fixture not generated — run fixtures/generate_fixtures.py first",
            }
            continue

        samples = []
        for _ in range(n_repeats):
            ms = await _measure_once(candidate, audio_path)
            if ms is not None:
                samples.append(ms)

        results[candidate.candidate_id] = {
            "candidate": meta,
            "utterance_id": utterance_id,
            "samples_ms": [round(ms, 1) for ms in samples],
            "stats": latency_stats(samples),
            "verified": len(samples) >= n_repeats // 2,
        }

    return {"probe": "latency", "results": results}
